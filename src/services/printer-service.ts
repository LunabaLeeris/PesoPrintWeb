import { PrintProgressEvent, PrintRequest } from '@/types';

export interface StreamCallbacks {
  onEvent: (event: PrintProgressEvent) => void;
  onError: (error: Error) => void;
  onDone: () => void;
}

/**
 * Normalizes base URL by stripping trailing slash
 */
export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Sends a print request to the Raspberry Pi Express server and streams
 * real-time SSE progress events (downloading, spooling, printing, completed).
 */
export async function streamPrintJob(
  serverUrl: string,
  request: PrintRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const base = normalizeServerUrl(serverUrl);
  const endpoint = `${base}/api/print-url`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        fileUrl: request.fileUrl,
        copies: request.copies || 1,
      }),
      signal,
    });

    if (!response.ok && !response.body) {
      throw new Error(`Print server error (${response.status}): ${response.statusText}`);
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
 * Quick ping to test if Raspberry Pi server is alive and reachable.
 */
export async function pingServer(serverUrl: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const base = normalizeServerUrl(serverUrl);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    // Try a standard GET on root or fallback to check connection
    const res = await fetch(`${base}/`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      message: `Connected (${res.status} ${res.statusText}) in ${latencyMs}ms`,
      latencyMs,
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
 * Generic caller for testing other endpoints on the Raspberry Pi Express server
 */
export async function invokeEndpoint(
  serverUrl: string,
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<{ status: number; ok: boolean; data: unknown; durationMs: number }> {
  const base = normalizeServerUrl(serverUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${cleanPath}`;
  const start = Date.now();

  const options: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
    },
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
