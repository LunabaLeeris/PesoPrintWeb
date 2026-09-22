'use client';

import React from 'react';
import { usePrinter } from '@/hooks/use-printer';
import {
  ServerConfig,
  FileUploader,
  PrintProgress,
  PrintLogs,
} from '@/components/features/printer';
import { Printer, Cloud, AlertCircle } from 'lucide-react';

export default function Home() {
  const {
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
    printFile,
    printUrl,
    cancelPrint,
    testConnection,
    clearLogs,
  } = usePrinter();

  if (!envStatus.isValid) {
    return (
      <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white p-6 flex items-center justify-center font-sans">
        <div className="max-w-lg w-full border-2 border-black dark:border-white p-6 rounded-lg space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <h2 className="text-base font-bold uppercase tracking-wider">
              Environment Variables Missing
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Startup check failed. Default fallback values have been removed to prevent leaking bucket names, IP addresses, or keys in version control.
          </p>
          <div className="space-y-1 bg-zinc-100 dark:bg-zinc-900 p-3 rounded border border-zinc-200 dark:border-zinc-800 font-mono text-xs">
            <p className="text-[11px] font-semibold text-zinc-500 mb-1">Missing keys in .env.local:</p>
            {envStatus.missingVars.map((v) => (
              <div key={v} className="text-red-500 font-semibold">• {v}</div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500">
            Please configure these in your local <code className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">.env.local</code> file and restart the Next.js dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-black bg-black text-white dark:border-white dark:bg-white dark:text-black rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PesoPrint Kiosk Console</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Laptop &rarr; Supabase Storage &rarr; Raspberry Pi CUPS Print Agent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <Cloud className="w-3.5 h-3.5 text-zinc-500" />
              <span>Bucket: {process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'Unset'}</span>
            </div>
          </div>
        </header>

        {/* Missing Environment Variables Warning Banner (if any) */}
        {envStatus.missingVars.length > 0 && (
          <div className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Missing Environment Variables Detected
              </p>
              <p className="text-zinc-500 font-mono text-[11px]">
                Please check your <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">.env.local</code> file: {envStatus.missingVars.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* 1. Server Connection Configuration */}
        <section>
          <ServerConfig
            serverUrl={serverUrl}
            onServerUrlChange={setServerUrl}
            onTestConnection={testConnection}
          />
        </section>

        {/* 2. Main Centered Print Flow */}
        <section className="space-y-6">
          <FileUploader
            onPrintFile={printFile}
            onPrintUrl={printUrl}
            isPrinting={isPrinting}
            isUploading={isUploading}
          />

          <PrintProgress
            stage={stage}
            progress={progress}
            statusMessage={statusMessage}
            jobId={jobId}
            isPrinting={isPrinting}
            onCancel={cancelPrint}
          />
        </section>

        {/* 3. Real-time Terminal Log Console */}
        <section>
          <PrintLogs logs={logs} onClear={clearLogs} />
        </section>

        {/* Minimal Footer */}
        <footer className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400 font-mono">
          <span>Targeting CUPS on Raspberry Pi • SSE text/event-stream reader active</span>
        </footer>
      </div>
    </div>
  );
}
