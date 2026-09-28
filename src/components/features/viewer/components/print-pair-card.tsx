'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PrintPairItem {
  id: string;
  pageNumber: number;
  copyIndex: number;
  label: string;
}

export interface PrintPairCardProps {
  pair: PrintPairItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
  isSelectedForReprint?: boolean;
  isReprintMode?: boolean;
  isReprinted?: boolean;
  status?: 'accepted' | 'rejected' | null;
  onClick?: (pair: PrintPairItem) => void;
  onLongPress?: (pair: PrintPairItem) => void;
  className?: string;
}

export const PrintPairCard: React.FC<PrintPairCardProps> = ({
  pair,
  pdfDoc,
  isSelectedForReprint = false,
  isReprintMode = false,
  isReprinted = false,
  status,
  onClick,
  onLongPress,
  className,
}) => {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const scannedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  // Long press tracking refs
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressFiredRef = useRef<boolean>(false);

  // Render original and prototype scanned canvas
  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTaskOriginal: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTaskScanned: any = null;

    async function renderCanvases() {
      if (!pdfDoc) {
        setIsRendering(false);
        return;
      }

      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pair.pageNumber);
        if (isCancelled) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const targetWidth = 180;
        const baseViewport = page.getViewport({ scale: 1.0 });
        const scale = (targetWidth / baseViewport.width) * Math.min(dpr, 2);
        const viewport = page.getViewport({ scale });

        // 1. Render Original Canvas
        const origCanvas = originalCanvasRef.current;
        if (origCanvas) {
          origCanvas.width = Math.floor(viewport.width);
          origCanvas.height = Math.floor(viewport.height);
          const origCtx = origCanvas.getContext('2d');
          if (origCtx) {
            renderTaskOriginal = page.render({
              canvasContext: origCtx,
              viewport,
            });
            await renderTaskOriginal.promise;
          }
        }

        if (isCancelled) return;

        // 2. Render Scanned Canvas (using actual page for prototyping as instructed)
        const scanCanvas = scannedCanvasRef.current;
        if (scanCanvas) {
          scanCanvas.width = Math.floor(viewport.width);
          scanCanvas.height = Math.floor(viewport.height);
          const scanCtx = scanCanvas.getContext('2d');
          if (scanCtx) {
            renderTaskScanned = page.render({
              canvasContext: scanCtx,
              viewport,
            });
            await renderTaskScanned.promise;
          }
        }

        if (!isCancelled) {
          setIsRendering(false);
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering pair ${pair.label}:`, err);
        }
      }
    }

    renderCanvases();

    return () => {
      isCancelled = true;
      if (renderTaskOriginal && typeof renderTaskOriginal.cancel === 'function') {
        renderTaskOriginal.cancel();
      }
      if (renderTaskScanned && typeof renderTaskScanned.cancel === 'function') {
        renderTaskScanned.cancel();
      }
    };
  }, [pdfDoc, pair.pageNumber, pair.label]);

  // Clean up long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Pointer Down: Start long-press detection
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isLongPressFiredRef.current = false;
      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
      };

      // 300ms long press threshold to trigger reprint choosing mode
      longPressTimerRef.current = setTimeout(() => {
        isLongPressFiredRef.current = true;
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(35);
          } catch {
            // Ignore vibration error on unsupported contexts
          }
        }
        onLongPress?.(pair);
      }, 300);
    },
    [onLongPress, pair]
  );

  // Pointer Move: Cancel long press if user drags/scrolls > 8px
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressTimerRef.current && pointerStartRef.current) {
      const distance = Math.hypot(
        e.clientX - pointerStartRef.current.x,
        e.clientY - pointerStartRef.current.y
      );
      if (distance > 8) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  // Pointer Up: Trigger click if released before long-press threshold
  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isLongPressFiredRef.current) {
      onClick?.(pair);
    }

    pointerStartRef.current = null;
  }, [onClick, pair]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`print-pair-${pair.id}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isReprintMode) {
            onClick?.(pair);
          } else {
            onClick?.(pair);
          }
        }
      }}
      aria-label={`${pair.label}, ${isSelectedForReprint ? 'selected for reprint' : 'tap to view comparison'}`}
      className={cn(
        'relative w-full bg-white select-none cursor-pointer overflow-hidden transition-all duration-200',
        'shadow-[0_2px_10px_rgba(0,0,0,0.06)]',
        isSelectedForReprint
          ? 'border-[3.5px] border-[#34418E] rounded-[14px] shadow-[0_6px_20px_rgba(52,65,142,0.22)] scale-[1.01]'
          : 'border border-[#D1D5DB] hover:border-[#9CA3AF] rounded-[10px]',
        className
      )}
    >
      {/* Top Center Pill Badge: "Page X" */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] sm:text-[12px] font-semibold bg-[#EAEBED]/95 text-[#4B5263] border border-[#CBD0DC] shadow-xs">
          {pair.label}
        </span>
      </div>

      {/* Loading Overlay */}
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] z-10">
          <Loader2 className="w-5 h-5 animate-spin text-[#34418E]/70" />
        </div>
      )}

      {/* Side-by-Side Grid: Left Original, Right Scanned */}
      <div className="w-full grid grid-cols-2 divide-x divide-[#E5E7EB] bg-[#F9FAFB]">
        {/* Left Side: Original PDF Page */}
        <div className="relative aspect-[1/1.414] bg-white flex items-center justify-center p-1.5 overflow-hidden">
          {/* Status Badge: Accepted or Rejected (Image C) */}
          {status === 'accepted' && (
            <div className="absolute bottom-2 left-2 z-20 pointer-events-none animate-fadeIn">
              <span className="inline-flex items-center px-3 py-1 rounded-[8px] text-[12px] sm:text-[13px] font-bold bg-[#22C55E] text-white shadow-sm">
                Accepted
              </span>
            </div>
          )}
          {status === 'rejected' && (
            <div className="absolute bottom-2 left-2 z-20 pointer-events-none animate-fadeIn">
              <span className="inline-flex items-center px-3 py-1 rounded-[8px] text-[12px] sm:text-[13px] font-bold bg-[#DC2626] text-white shadow-sm">
                Rejected
              </span>
            </div>
          )}

          <canvas
            ref={originalCanvasRef}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* Right Side: Scanned Version (using actual page for prototyping with subtle scan backdrop) */}
        <div className="relative aspect-[1/1.414] bg-[#F3F4F6] flex items-center justify-center p-1.5 overflow-hidden">
          <canvas
            ref={scannedCanvasRef}
            className="w-full h-full object-contain pointer-events-none brightness-[0.98] contrast-[1.03]"
          />
        </div>
      </div>

      {/* Bottom Center Reprint Badge */}
      {isReprinted && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fadeIn">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-[11px] sm:text-[12px] font-bold bg-[#34418E] text-white shadow-md tracking-wide">
            Reprint
          </span>
        </div>
      )}
    </div>
  );
};
