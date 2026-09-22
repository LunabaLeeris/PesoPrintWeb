'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrintLogEntry } from '@/types';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';

interface PrintLogsProps {
  logs: PrintLogEntry[];
  onClear: () => void;
}

export function PrintLogs({ logs, onClear }: PrintLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto scroll to bottom whenever logs update
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${(l.stage || 'INFO').toUpperCase()}] ${l.message} ${
            l.details ? JSON.stringify(l.details) : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: PrintLogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-400 font-semibold';
      case 'warn':
        return 'text-yellow-400';
      case 'success':
        return 'text-emerald-400 font-medium';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <Card className="border border-zinc-800 bg-zinc-950 text-zinc-100 p-0 overflow-hidden font-mono text-xs">
      <CardHeader className="p-3 border-b border-zinc-800 bg-zinc-900/80 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
            Real-time Terminal Logs ({logs.length})
          </CardTitle>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="h-7 px-2 text-zinc-400 hover:text-white dark:hover:bg-zinc-800"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={logs.length === 0}
            className="h-7 px-2 text-zinc-400 hover:text-white dark:hover:bg-zinc-800"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>

      <div
        ref={containerRef}
        className="h-64 overflow-y-auto p-3 space-y-1.5 leading-relaxed selection:bg-zinc-700 selection:text-white"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600">
            <p>Ready. Waiting for print requests or endpoint commands...</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 break-all">
              <span className="text-zinc-500 shrink-0 select-none">[{log.timestamp}]</span>
              {log.stage && (
                <span className="text-zinc-400 font-semibold shrink-0 select-none">
                  [{log.stage.toUpperCase()}]
                </span>
              )}
              <span className={getLevelColor(log.level)}>{log.message}</span>
              {log.details && (
                <pre className="text-[11px] text-zinc-400 ml-2 bg-zinc-900/60 p-1 rounded inline-block">
                  {typeof log.details === 'object'
                    ? JSON.stringify(log.details)
                    : String(log.details)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
