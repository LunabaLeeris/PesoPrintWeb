'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface PageThumbnailCardProps {
  pageNumber: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
  copies?: number;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const PageThumbnailCard: React.FC<PageThumbnailCardProps> = ({
  pageNumber,
  pdfDoc,
  copies = 1,
  isSelected = false,
  onClick,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const hasRenderedRef = useRef<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;

    async function renderThumbnail() {
      if (!pdfDoc || !canvasRef.current) {
        setIsRendering(false);
        return;
      }

      // If already rendered, do not re-render
      if (hasRenderedRef.current && canvasRef.current && canvasRef.current.width > 0) {
        setIsRendering(false);
        return;
      }

      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render at 2x resolution for crisp text
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const targetWidth = 180;
        const baseViewport = page.getViewport({ scale: 1.0 });
        const scale = (targetWidth / baseViewport.width) * Math.min(dpr, 2);
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });

        await renderTask.promise;
        if (!isCancelled) {
          hasRenderedRef.current = true;
          setIsRendering(false);
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering thumbnail for page ${pageNumber}:`, err);
        }
      }
    }

    renderThumbnail();

    return () => {
      isCancelled = true;
      if (renderTask && typeof renderTask.cancel === 'function') {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Page ${pageNumber}, ${copies} ${copies === 1 ? 'copy' : 'copies'}`}
      className={cn(
        'relative bg-white rounded-[3px] border border-[#CBD0DC]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden cursor-pointer',
        'transition-all duration-150 active:scale-[0.98] hover:shadow-md hover:border-[#34418E]/60',
        'aspect-[1/1.414] flex items-center justify-center select-none',
        isSelected && 'ring-2 ring-[#34418E] border-[#34418E]',
        className
      )}
    >
      {/* Loading indicator when PDF page is being rendered */}
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-5">
          <Loader2 className="w-5 h-5 animate-spin text-[#34418E]/60" />
        </div>
      )}

      {/* Rendered PDF Page Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* Center Copy Count Circular Badge matching mockup */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full border border-black/15 bg-white/70 backdrop-blur-[1px] shadow-sm flex items-center justify-center">
          <span className="text-[26px] sm:text-[32px] font-bold text-[#1E222E] tracking-tight leading-none">
            {copies}
          </span>
        </div>
      </div>

      {/* Bottom-right Page Number Pill Badge */}
      <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-[10px] bg-[#EAEBED]/95 border border-[#D5D8DF] shadow-xs pointer-events-none z-10">
        <span className="text-[11px] sm:text-[12px] font-semibold text-[#4B5263]">
          Page {pageNumber}
        </span>
      </div>
    </div>
  );
};
