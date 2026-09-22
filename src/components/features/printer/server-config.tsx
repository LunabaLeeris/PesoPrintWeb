'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Globe, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface ServerConfigProps {
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  onTestConnection: () => Promise<{ ok: boolean; message: string; latencyMs: number }>;
}

export function ServerConfig({
  serverUrl,
  onServerUrlChange,
  onTestConnection,
}: ServerConfigProps) {
  const [localUrl, setLocalUrl] = useState(serverUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [pingStatus, setPingStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleApply = (url: string) => {
    setLocalUrl(url);
    onServerUrlChange(url);
    setPingStatus(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setPingStatus(null);
    try {
      const res = await onTestConnection();
      setPingStatus({ ok: res.ok, message: res.message });
    } catch {
      setPingStatus({ ok: false, message: 'Could not reach server' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="border border-zinc-300 dark:border-zinc-800 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Raspberry Pi Server Endpoint
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              value={localUrl}
              onChange={(e) => {
                setLocalUrl(e.target.value);
                onServerUrlChange(e.target.value);
              }}
              placeholder="e.g. http://<server-ip>:5000 or https://<id>.ngrok-free.app"
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleTest}
              disabled={isTesting || !localUrl.trim()}
              className="shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing' : 'Ping'}
            </Button>
          </div>
        </div>
      </div>

      {/* Status & Reset Bar */}
      <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-500">
          {process.env.NEXT_PUBLIC_PRINT_SERVER_URL && (
            <button
              type="button"
              onClick={() => handleApply(process.env.NEXT_PUBLIC_PRINT_SERVER_URL || '')}
              className="px-2 py-0.5 rounded border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 font-mono text-[11px]"
            >
              Reset to .env
            </button>
          )}
          {localUrl && (
            <button
              type="button"
              onClick={() => handleApply('')}
              className="px-2 py-0.5 rounded border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 font-mono text-[11px]"
            >
              Clear
            </button>
          )}
        </div>

        {pingStatus && (
          <div className={`flex items-center gap-1.5 font-mono text-[11px] ${
            pingStatus.ok ? 'text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-500'
          }`}>
            {pingStatus.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>{pingStatus.message}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
