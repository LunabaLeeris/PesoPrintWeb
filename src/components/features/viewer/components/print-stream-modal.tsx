'use client';

import React, { useEffect, useRef } from 'react';
import { PrintStage, PrintLogEntry } from '@/types';
import { Loader2, CheckCircle2, AlertCircle, X, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PrintStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: PrintStage;
  progress: number;
  statusMessage: string;
  logs: PrintLogEntry[];
  isPrinting: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  serverUrl?: string;
}

export const PrintStreamModal: React.FC<PrintStreamModalProps> = ({
  isOpen,
  onClose,
  stage,
  progress,
  statusMessage,
  logs,
  isPrinting,
  onCancel,
  onRetry,
  serverUrl,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom as streaming events arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const isCompleted = stage === 'completed';
  const isError = stage === 'error';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Printing Document Progress"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            {isPrinting && (
              <Loader2 className="w-6 h-6 text-[#34418E] animate-spin shrink-0" />
            )}
            {isCompleted && (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            )}
            {isError && (
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {isCompleted
                  ? 'Print Completed'
                  : isError
                  ? 'Print Failed'
                  : 'Printing Document...'}
              </h2>
              {serverUrl && (
                <p className="text-xs text-gray-500 font-mono truncate max-w-[280px]">
                  Target: {serverUrl}
                </p>
              )}
            </div>
          </div>

          {!isPrinting && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Status & Progress Section */}
        <div className="p-6 space-y-4">
          {/* Status Message */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              {statusMessage || 'Processing print request...'}
            </span>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800'
                  : isError
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-[#34418E]'
              )}
            >
              {stage}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300 ease-out',
                isCompleted
                  ? 'bg-emerald-500'
                  : isError
                  ? 'bg-red-500'
                  : 'bg-[#34418E]'
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>Progress: {progress}%</span>
            <span>Copies: 1</span>
          </div>

          {/* Terminal Logs Stream Box */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-gray-500" />
                Live Server Logs (SSE)
              </span>
              <span className="text-[11px] text-gray-400">{logs.length} events</span>
            </div>

            <div
              ref={logContainerRef}
              className="w-full h-48 bg-[#181B20] text-gray-200 rounded-xl p-3 font-mono text-xs overflow-y-auto space-y-1 select-text border border-gray-800 shadow-inner"
            >
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">Waiting for print server events...</p>
              ) : (
                logs.map((log) => {
                  const isErr = log.level === 'error';
                  const isSuccess = log.level === 'success';
                  const isWarn = log.level === 'warn';

                  return (
                    <div key={log.id} className="leading-relaxed flex items-start gap-2">
                      <span className="text-gray-500 shrink-0 text-[10px]">
                        [{log.timestamp}]
                      </span>
                      {log.stage && (
                        <span className="text-blue-400 shrink-0 font-semibold text-[10px]">
                          [{log.stage}]
                        </span>
                      )}
                      <span
                        className={cn(
                          'break-all',
                          isErr
                            ? 'text-red-400 font-semibold'
                            : isSuccess
                            ? 'text-emerald-400 font-semibold'
                            : isWarn
                            ? 'text-amber-400'
                            : 'text-gray-300'
                        )}
                      >
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          {isPrinting && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel Print
            </button>
          )}

          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 text-sm font-semibold bg-[#34418E] text-white hover:bg-[#2A3575] rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Retry Print
            </button>
          )}

          {!isPrinting && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-[#34418E] text-white hover:bg-[#2A3575] rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
