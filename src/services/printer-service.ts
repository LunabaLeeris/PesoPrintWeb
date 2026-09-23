import { PrintProgressEvent, PrintRequest } from '@/types';
import { getKioskSecretKey } from '@/lib/env';

export { getKioskSecretKey };

export interface StreamCallbacks {
  onEvent: (event: PrintProgressEvent) => void;
  onError: (error: Error) => void;
  onDone: () => void;
}

export interface StreamPrintOptions {
  secretKey?: string;
  signal?: AbortSignal;
}

/**
 * Normalizes base URL by stripping trailing slash
 */
export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Structured health check result for the Raspberry Pi Express server
 */
export interface KioskHealthResult {
  isHealthy: boolean;
  status: number;
  message: string;
  printer?: string;
  uptime?: number;
  latencyMs: number;
}

/**
 * Resolves the server URL for a kiosk:
 * 1. If given a full URL (starts with http:// or https://), uses it directly.
 * 2. If given a kiosk UUID, fetches the kiosk's tunnel column from Supabase.
 * 3. Falls back to NEXT_PUBLIC_PRINT_SERVER_URL.
 */
export async function resolvePrinterUrl(kioskIdOrUrl?: string): Promise<string> {
  if (!kioskIdOrUrl) {
    return process.env.NEXT_PUBLIC_PRINT_SERVER_URL || '';
  }

  if (kioskIdOrUrl.startsWith('http://') || kioskIdOrUrl.startsWith('https://')) {
    return normalizeServerUrl(kioskIdOrUrl);
  }

  // Treat as kiosk ID and fetch tunnel from Supabase
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data } = await supabase
      .from('kiosks')
      .select('tunnel')
      .eq('id', kioskIdOrUrl)
      .maybeSingle();

    if (data?.tunnel) {
      return normalizeServerUrl(data.tunnel);
    }
  } catch (err) {
    console.warn('Failed to resolve kiosk tunnel URL from Supabase:', err);
  }

  return process.env.NEXT_PUBLIC_PRINT_SERVER_URL || '';
}

/**
 * Checks if the Raspberry Pi print server is healthy and reachable.
 * Uses the kiosk's Cloudflare tunnel URL or local address and authenticates with x-kiosk-key.
 */
export async function checkKioskPrinterHealth(
  kioskIdOrUrl: string,
  secretKey?: string,
  timeoutMs: number = 3500
): Promise<KioskHealthResult> {
  const startTime = Date.now();
  const serverUrl = await resolvePrinterUrl(kioskIdOrUrl);

  if (!serverUrl) {
    return {
      isHealthy: false,
      status: 0,
      message: 'No printer server URL or tunnel configured for this kiosk.',
      latencyMs: 0,
    };
  }

  const base = normalizeServerUrl(serverUrl);
  const key = secretKey || getKioskSecretKey();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {};
    if (key) {
      headers['x-kiosk-key'] = key;
    }

    const res = await fetch(`${base}/api/health`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;
    let data: Record<string, unknown> | null = null;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      // not json
    }

    if (!res.ok) {
      const errorMsg =
        res.status === 502
          ? 'Printer service is offline (502 Bad Gateway from tunnel).'
          : res.status === 401
          ? 'Unauthorized: Invalid kiosk secret key.'
          : `Printer server error (${res.status} ${res.statusText})`;
      return {
        isHealthy: false,
        status: res.status,
        message: errorMsg,
        latencyMs,
      };
    }

    const isOkStatus = data?.status === 'ok';
    return {
      isHealthy: isOkStatus,
      status: res.status,
      message: isOkStatus
        ? 'Printer is healthy and ready'
        : (data?.error as string) || 'Unexpected health response from printer',
      printer: typeof data?.printer === 'string' ? data.printer : undefined,
      uptime: typeof data?.uptime === 'number' ? data.uptime : undefined,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const isAbort =
      (err as DOMException)?.name === 'AbortError' ||
      (err as Error)?.message?.toLowerCase().includes('abort');
    return {
      isHealthy: false,
      status: 0,
      message: isAbort
        ? 'Printer connection timed out (printer is offline or unreachable).'
        : err instanceof Error
        ? err.message
        : 'Failed to connect to printer server.',
      latencyMs,
    };
  }
}

/**
 * Sends a print request to the Raspberry Pi Express server and streams
 * real-time SSE progress events (downloading, spooling, printing, completed).
 * Authenticates with x-kiosk-key using KIOSK_SECRET_KEY.
 */
export async function streamPrintJob(
  serverUrl: string,
  request: PrintRequest,
  callbacks: StreamCallbacks,
  signalOrOptions?: AbortSignal | StreamPrintOptions
): Promise<void> {
  const base = normalizeServerUrl(serverUrl);
  const endpoint = `${base}/api/print-url`;

  const isAbortSignal =
    signalOrOptions instanceof AbortSignal ||
    Boolean(signalOrOptions && typeof (signalOrOptions as AbortSignal).aborted === 'boolean');

  const signal = isAbortSignal
    ? (signalOrOptions as AbortSignal)
    : (signalOrOptions as StreamPrintOptions)?.signal;

  const secretKey =
    (!isAbortSignal && (signalOrOptions as StreamPrintOptions)?.secretKey) ||
    getKioskSecretKey();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    if (secretKey) {
      headers['x-kiosk-key'] = secretKey;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileUrl: request.fileUrl,
        copies: request.copies || 1,
      }),
      signal,
    });

    if (!response.ok && !response.body) {
      const msg =
        response.status === 502
          ? 'Printer service is currently offline (502 Bad Gateway from tunnel).'
          : response.status === 401
          ? 'Unauthorized: Invalid kiosk secret key.'
          : `Print server error (${response.status}): ${response.statusText}`;
      throw new Error(msg);
    }

    if (!response.body) {
      throw new Error('Print server did not return an event stream.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonString = trimmed.replace(/^data:\s*/, '').trim();
          if (jsonString) {
            try {
              const data = JSON.parse(jsonString) as PrintProgressEvent;
              callbacks.onEvent(data);
              if (data.stage === 'error' || data.error) {
                callbacks.onError(new Error(data.error || 'Unknown server error during printing'));
              }
            } catch (err) {
              console.warn('[SSE] JSON parse warning for line:', jsonString, err);
            }
          }
        }
      }
    }

    callbacks.onDone();
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') {
      callbacks.onError(new Error('Print job stream was cancelled.'));
      return;
    }
    callbacks.onError(
      error instanceof Error ? error : new Error('Unable to connect to Raspberry Pi server.')
    );
  }
}

/**
 * Health check to test if Raspberry Pi server is alive and reachable.
 * Calls /api/health with the required x-kiosk-key authentication header.
 */
export async function pingServer(
  serverUrl: string,
  secretKey?: string
): Promise<{ ok: boolean; message: string; latencyMs: number; data?: unknown }> {
  const base = normalizeServerUrl(serverUrl);
  const startTime = Date.now();
  const key = secretKey || getKioskSecretKey();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = {};
    if (key) {
      headers['x-kiosk-key'] = key;
    }

    // Pi Express server exposes /api/health with x-kiosk-key authentication
    const res = await fetch(`${base}/api/health`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      // ignore
    }

    if (!res.ok) {
      return {
        ok: false,
        message: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs,
        data,
      };
    }

    return {
      ok: true,
      message: `Connected (${res.status} ${res.statusText}) in ${latencyMs}ms`,
      latencyMs,
      data,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const isAbort =
      (err as DOMException)?.name === 'AbortError' ||
      (err as Error)?.message?.toLowerCase().includes('abort');
    return {
      ok: false,
      message: isAbort ? 'Timed out (server unreachable)' : err instanceof Error ? err.message : 'Connection failed',
      latencyMs,
    };
  }
}

/**
 * Generic caller for testing other endpoints on the Raspberry Pi Express server.
 * Automatically injects the x-kiosk-key header.
 */
export async function invokeEndpoint(
  serverUrl: string,
  path: string,
  method: string = 'GET',
  body?: unknown,
  secretKey?: string
): Promise<{ status: number; ok: boolean; data: unknown; durationMs: number }> {
  const base = normalizeServerUrl(serverUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${cleanPath}`;
  const start = Date.now();
  const key = secretKey || getKioskSecretKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (key) {
    headers['x-kiosk-key'] = key;
  }

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers,
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const durationMs = Date.now() - start;

  let data: unknown;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    durationMs,
  };
}
