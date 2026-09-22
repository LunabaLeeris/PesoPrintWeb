'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PrintStage, PrintLogEntry, PrintProgressEvent } from '@/types';
import { uploadPrintDocument } from '@/services/storage-service';
import { streamPrintJob, pingServer, invokeEndpoint } from '@/services/printer-service';
import { validateEnvironment } from '@/lib/env';

export function usePrinter() {
  const envValidation = validateEnvironment();
  const envStatus = {
    isValid: envValidation.isValid,
    missingVars: envValidation.missingVars,
    hasPrintServerUrl: Boolean(envValidation.env.NEXT_PUBLIC_PRINT_SERVER_URL),
    hasSupabaseUrl: Boolean(envValidation.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(envValidation.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasStorageBucket: Boolean(envValidation.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET),
  };

  const [serverUrl, setServerUrlState] = useState<string>(
    envValidation.env.NEXT_PUBLIC_PRINT_SERVER_URL || ''
  );
  const [stage, setStage] = useState<PrintStage>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [jobId, setJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<PrintLogEntry[]>([]);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [lastFileUrl, setLastFileUrl] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load persisted serverUrl from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pesoprint_server_url');
      if (saved) {
        setServerUrlState(saved);
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const setServerUrl = (url: string) => {
    setServerUrlState(url);
    try {
      localStorage.setItem('pesoprint_server_url', url);
    } catch {
      // ignore storage error
    }
  };

  const addLog = useCallback((
    message: string,
    level: PrintLogEntry['level'] = 'info',
    stageName?: string,
    details?: Record<string, unknown> | string | number | null
  ) => {
    const entry: PrintLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      stage: stageName,
      message,
      level,
      details,
    };
    setLogs((prev) => [...prev, entry]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  /**
   * Uploads file to Supabase Storage, then instructs Raspberry Pi to print it via SSE
   */
  const printFile = useCallback(async (file: File, copies: number = 1) => {
    if (isPrinting) return;

    setIsPrinting(true);
    setIsUploading(true);
    setStage('uploading');
    setProgress(10);
    setStatusMessage('Uploading document to Supabase Storage...');
    setJobId(null);

    addLog(`Initiating upload for "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`, 'info', 'uploading');

    let uploadedUrl = '';
    try {
      const uploadResult = await uploadPrintDocument(file);
      uploadedUrl = uploadResult.publicUrl;
      setLastFileUrl(uploadedUrl);
      setIsUploading(false);
      setProgress(20);
      addLog(`Document saved to Supabase: ${uploadedUrl}`, 'success', 'uploading');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload to Supabase failed';
      setIsUploading(false);
      setIsPrinting(false);
      setStage('error');
      setProgress(0);
      setStatusMessage(errorMsg);
      addLog(errorMsg, 'error', 'uploading');
      return;
    }

    // Now start the print job on the Raspberry Pi
    await executePrintUrl(uploadedUrl, copies);
  }, [isPrinting, serverUrl, addLog]);

  /**
   * Prints directly from an existing URL (skips Supabase upload if already hosted)
   */
  const printUrl = useCallback(async (fileUrl: string, copies: number = 1) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setLastFileUrl(fileUrl);
    await executePrintUrl(fileUrl, copies);
  }, [isPrinting, serverUrl]);

  /**
   * Core execution of Pi SSE stream
   */
  const executePrintUrl = async (fileUrl: string, copies: number) => {
    setStage('downloading');
    setProgress(25);
    setStatusMessage('Connecting to Raspberry Pi print server...');
    addLog(`Sending job to Pi (${serverUrl}/api/print-url) with ${copies} copy(ies)...`, 'info', 'connect');

    abortControllerRef.current = new AbortController();

    await streamPrintJob(
      serverUrl,
      { fileUrl, copies },
      {
        onEvent: (event: PrintProgressEvent) => {
          if (event.stage) setStage(event.stage);
          if (typeof event.progress === 'number') setProgress(event.progress);
          if (event.jobId) setJobId(event.jobId);
          if (event.message) setStatusMessage(event.message);

          const level: PrintLogEntry['level'] =
            event.stage === 'error'
              ? 'error'
              : event.stage === 'completed'
                ? 'success'
                : 'info';

          addLog(
            event.message || `Stage changed to ${event.stage}`,
            level,
            event.stage,
            event.jobId ? { jobId: event.jobId } : undefined
          );
        },
        onError: (err: Error) => {
          setIsPrinting(false);
          setStage('error');
          setStatusMessage(err.message);
          addLog(`Print Error: ${err.message}`, 'error', 'error');
        },
        onDone: () => {
          setIsPrinting(false);
          setStage('completed');
          setProgress(100);
          setStatusMessage('Document printed successfully.');
          addLog('Stream finished. Job completed.', 'success', 'completed');
        },
      },
      abortControllerRef.current.signal
    );
  };

  /**
   * Aborts ongoing print stream
   */
  const cancelPrint = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsPrinting(false);
      setStage('error');
      setStatusMessage('Print job stream aborted by user.');
      addLog('Stream aborted by user.', 'warn', 'aborted');
    }
  }, [addLog]);

  /**
   * Pings the Raspberry Pi server
   */
  const testConnection = useCallback(async () => {
    addLog(`Testing connection to ${serverUrl}...`, 'info', 'ping');
    const result = await pingServer(serverUrl);
    if (result.ok) {
      addLog(`Server is online: ${result.message}`, 'success', 'ping');
    } else {
      addLog(`Server connection failed: ${result.message}`, 'error', 'ping');
    }
    return result;
  }, [serverUrl, addLog]);

  /**
   * Generic endpoint invoker for testing other endpoints
   */
  const runEndpoint = useCallback(async (
    path: string,
    method: string = 'GET',
    body?: unknown
  ) => {
    addLog(`Request [${method.toUpperCase()}] ${path}...`, 'info', 'endpoint');
    try {
      const res = await invokeEndpoint(serverUrl, path, method, body);
      const level = res.ok ? 'success' : 'warn';
      const output = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data);
      addLog(`Response (${res.status}) in ${res.durationMs}ms: ${output}`, level, 'endpoint');
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      addLog(`Endpoint call failed: ${msg}`, 'error', 'endpoint');
      return { status: 0, ok: false, data: msg, durationMs: 0 };
    }
  }, [serverUrl, addLog]);

  // Log warning if any required environment variable is missing
  useEffect(() => {
    if (envStatus.missingVars.length > 0) {
      addLog(
        `Missing environment variables in .env.local: ${envStatus.missingVars.join(', ')}`,
        'warn',
        'env'
      );
    }
  }, [addLog]);

  return {
    serverUrl,
    setServerUrl,
    envStatus,
    stage,
    progress,
    statusMessage,
    jobId,
    logs,
    isPrinting,
    isUploading,
    lastFileUrl,
    printFile,
    printUrl,
    cancelPrint,
    testConnection,
    runEndpoint,
    clearLogs,
  };
}
