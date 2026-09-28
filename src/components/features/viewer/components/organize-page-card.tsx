'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRightLeft } from 'lucide-react';

// Global cache for rendered thumbnail canvases across organize cards to enable instantaneous retrieval
const organizeCardCanvasCache = new Map<number, HTMLCanvasElement>();

export interface OrganizePageCardProps {
  pageNumber: number;
  visibleIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
  isSelected?: boolean;
  isRearrangeSource?: boolean;
  isRearrangeMode?: boolean;
  isDeletionMode?: boolean;
  onClick?: (index: number) => void;
  onLongPress?: (index: number) => void;
  className?: string;
}

export const OrganizePageCard: React.FC<OrganizePageCardProps> = ({
  pageNumber,
  visibleIndex,
  pdfDoc,
  isSelected = false,
  isRearrangeSource = false,
  isRearrangeMode = false,
  isDeletionMode = false,
  onClick,
  onLongPress,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressFiredRef = useRef<boolean>(false);

  // Render PDF page thumbnail onto canvas
  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;

    async function drawPage() {
      if (!canvasRef.current) return;
      const targetCanvas = canvasRef.current;

      // 1. Instant draw if already cached in memory
      const cached = organizeCardCanvasCache.get(pageNumber);
      if (cached && cached.width > 0) {
        targetCanvas.width = cached.width;
        targetCanvas.height = cached.height;
        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(cached, 0, 0);
          setIsRendering(false);
          return;
        }
      }

      if (!pdfDoc) {
        setIsRendering(false);
        return;
      }

      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const targetWidth = 220;
        const baseViewport = page.getViewport({ scale: 1.0 });
        const scale = (targetWidth / baseViewport.width) * Math.min(dpr, 2);
        const viewport = page.getViewport({ scale });

        targetCanvas.width = Math.floor(viewport.width);
        targetCanvas.height = Math.floor(viewport.height);

        const ctx = targetCanvas.getContext('2d');
        if (!ctx) return;

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });

        await renderTask.promise;
        if (!isCancelled) {
          // Cache the rendered offscreen canvas for instantaneous retrieval
          const offscreen = document.createElement('canvas');
          offscreen.width = targetCanvas.width;
          offscreen.height = targetCanvas.height;
          const offscreenCtx = offscreen.getContext('2d');
          if (offscreenCtx) {
            offscreenCtx.drawImage(targetCanvas, 0, 0);
            organizeCardCanvasCache.set(pageNumber, offscreen);
          }
          setIsRendering(false);
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber} in OrganizeCard:`, err);
        }
      }
    }

    drawPage();

    return () => {
      isCancelled = true;
      if (renderTask && typeof renderTask.cancel === 'function') {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber]);

  // Clean up any long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Pointer Down: Start long-press detection if not in deletion mode or rearrange mode
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // If already in deletion mode or rearrange mode, clicks handle actions directly
      if (isDeletionMode || isRearrangeMode) {
        return;
      }

      isLongPressFiredRef.current = false;
      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
      };

      // 250ms long press threshold to trigger rearrange mode
      longPressTimerRef.current = setTimeout(() => {
        isLongPressFiredRef.current = true;
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(35);
          } catch {
            // Ignore vibration errors on unprivileged contexts
          }
        }
        onLongPress?.(visibleIndex);
      }, 250);
    },
    [isDeletionMode, isRearrangeMode, onLongPress, visibleIndex]
  );

  // Pointer Move: Cancel long press if user moves > 8px (e.g. scrolling the page grid)
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

  // Pointer Up: If released before long-press fired, trigger normal click
  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Only fire click if long press was not activated
    if (!isLongPressFiredRef.current) {
      onClick?.(visibleIndex);
    }

    pointerStartRef.current = null;
  }, [onClick, visibleIndex]);

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
      data-organize-card-index={visibleIndex}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(visibleIndex);
        }
      }}
      aria-label={`Page ${pageNumber}${isSelected ? ', selected for deletion' : ''}${
        isRearrangeSource ? ', selected to move' : ''
      }`}
      className={cn(
        'relative bg-white aspect-[1/1.414] overflow-hidden cursor-pointer select-none',
        'transition-all duration-200 ease-out flex items-center justify-center',
        // Border styles matching mockup
        isSelected
          ? 'border-[3.5px] border-[#DC2626] rounded-[8px] sm:rounded-[10px] shadow-[0_4px_16px_rgba(220,38,38,0.18)] scale-[0.99]'
          : isRearrangeSource
          ? 'border-[3.5px] border-[#34418E] rounded-[8px] sm:rounded-[10px] shadow-[0_6px_20px_rgba(52,65,142,0.25)] scale-[1.03] z-20 ring-2 ring-[#34418E]/30'
          : isRearrangeMode
          ? 'border-2 border-dashed border-[#34418E]/50 hover:border-[#34418E] hover:scale-[1.01] rounded-[8px] sm:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
          : 'border border-[#CBD0DC] hover:border-[#34418E]/60 rounded-[8px] sm:rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        className
      )}
    >
      {/* Loading indicator when PDF page is being rendered */}
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] z-5">
          <Loader2 className="w-5 h-5 animate-spin text-[#34418E]/60" />
        </div>
      )}

      {/* Rendered PDF Page Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* Top Left Indicator when page is selected for moving */}
      {isRearrangeSource && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none animate-pulse">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#34418E] text-white shadow-sm">
            <ArrowRightLeft className="w-3 h-3" />
            Moving
          </span>
        </div>
      )}

      {/* Bottom Right Page Badge: "Page X" matching reference image */}
      <div className="absolute bottom-2 sm:bottom-2.5 right-2 sm:right-2.5 z-10 pointer-events-none">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-[12px] font-medium tracking-wide shadow-sm',
            isSelected
              ? 'bg-red-50 text-red-700 font-semibold'
              : isRearrangeSource
              ? 'bg-[#34418E] text-white font-semibold'
              : 'bg-[#E5E7EB]/90 backdrop-blur-sm text-[#4B5563]'
          )}
        >
          Page {pageNumber}
        </span>
      </div>
    </div>
  );
};
