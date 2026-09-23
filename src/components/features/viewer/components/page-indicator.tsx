import React from 'react';
import { cn } from '@/lib/utils';

export interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
  className?: string;
}

export const PageIndicator: React.FC<PageIndicatorProps> = ({
  currentPage,
  totalPages,
  className,
}) => {
  return (
    <div
      aria-label={`Page ${currentPage} of ${totalPages}`}
      className={cn(
        'px-3.5 py-1.5 rounded-[12px] bg-[#EAEBED]/90 backdrop-blur-sm',
        'border border-[#DCDFE5] text-[#3E4354] font-semibold text-[13px] sm:text-[14px]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.06)] select-none pointer-events-none',
        className
      )}
    >
      Page {currentPage}/{totalPages || 1}
    </div>
  );
};
