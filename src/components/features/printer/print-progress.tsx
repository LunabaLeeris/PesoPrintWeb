'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PrintStage } from '@/types';
import { StopCircle, Hash } from 'lucide-react';

interface PrintProgressProps {
  stage: PrintStage;
  progress: number;
  statusMessage: string;
  jobId: string | null;
  isPrinting: boolean;
  onCancel: () => void;
}

export function PrintProgress({
  stage,
  progress,
  statusMessage,
  jobId,
  isPrinting,
  onCancel,
}: PrintProgressProps) {
  const getStageLabel = (st: PrintStage): string => {
    switch (st) {
      case 'uploading':
        return '1/4 Uploading to Cloud';
      case 'downloading':
        return '2/4 Pi Fetching File';
      case 'spooling':
        return '3/4 CUPS Spooling';
      case 'printing':
        return '4/4 Printing Paper';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      default:
        return 'Standby';
    }
  };

  return (
    <Card className="border border-zinc-300 dark:border-zinc-800 p-4">
      <div className="space-y-3">
        {/* Header with Stage badge & percentage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-mono px-2 py-0.5 rounded border border-black bg-black text-white dark:border-white dark:bg-white dark:text-black font-semibold">
              {getStageLabel(stage)}
            </span>
            {jobId && (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded">
                <Hash className="w-3 h-3" />
                Job: {jobId}
              </span>
            )}
          </div>
          <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {progress}%
          </span>
        </div>

        {/* Minimalist Progress Bar */}
        <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-black dark:bg-white transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        {/* Message and optional Cancel button */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <p className="text-zinc-600 dark:text-zinc-400 truncate font-mono">
            {statusMessage}
          </p>

          {isPrinting && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="shrink-0 text-xs h-7 px-2"
            >
              <StopCircle className="w-3.5 h-3.5 mr-1" />
              Abort
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
