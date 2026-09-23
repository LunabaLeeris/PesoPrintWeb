'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  className?: string;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  className,
}) => {
  return (
    <div
      aria-label="Document zoom controls"
      className={cn(
        'inline-flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-black/[0.06]',
        className
      )}
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={scale <= 0.6}
        aria-label="Zoom out"
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#34418E] hover:bg-[#F0F2F8] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onResetZoom}
        title="Reset zoom"
        aria-label={`Current zoom ${Math.round(scale * 100)}%, click to reset`}
        className="px-2 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-[#3E4354] hover:bg-[#F0F2F8] active:scale-95 transition-all cursor-pointer"
      >
        {Math.round(scale * 100)}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={scale >= 3.0}
        aria-label="Zoom in"
        className="w-8 h-8 rounded-full flex items-center justify-center text-[#34418E] hover:bg-[#F0F2F8] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
};
