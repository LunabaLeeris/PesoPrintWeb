'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { DocumentCostSummary } from '@/services/cost-service';
import { cn } from '@/lib/utils';

export interface PaymentPanelProps {
  kioskId?: string;
  documentId?: string;
  cost?: number;
  totalPages?: number;
  totalCopies?: number;
  colorScheme?: string;
  paperSize?: string;
  onSelectOnline?: () => void;
  onSelectCoinslot?: () => void;
  className?: string;
  animateEntrance?: boolean;
}

export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  kioskId,
  documentId,
  cost: propCost,
  totalPages: propTotalPages,
  totalCopies: propTotalCopies,
  colorScheme = 'B&W',
  paperSize = 'A4',
  onSelectOnline,
  onSelectCoinslot,
  className,
  animateEntrance = true,
}) => {
  const [costSummary, setCostSummary] = useState<DocumentCostSummary | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  // Touch gesture tracking for swiping down/up
  const touchStartYRef = useRef<number | null>(null);
  const currentDragYRef = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);

  useEffect(() => {
    if (!documentId) return;
    try {
      const stored = sessionStorage.getItem(`cost_summary_${documentId}`);
      if (stored) {
        setCostSummary(JSON.parse(stored) as DocumentCostSummary);
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, [documentId]);

  const displayCost = costSummary?.totalCost ?? propCost ?? 72;
  const displayPages = costSummary?.totalPages ?? propTotalPages ?? 1;
  const displayCopies = costSummary?.totalCopies ?? propTotalCopies ?? 1;
  const displayScheme = costSummary?.colorScheme ?? colorScheme;

  // Handle Touch Start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    currentDragYRef.current = 0;
  };

  // Handle Touch Move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;

    // If currently expanded, only allow dragging downwards (positive delta)
    if (!isCollapsed && deltaY > 0) {
      setDragOffset(deltaY);
      currentDragYRef.current = deltaY;
    }
    // If currently collapsed, only allow dragging upwards (negative delta)
    else if (isCollapsed && deltaY < 0) {
      setDragOffset(deltaY);
      currentDragYRef.current = deltaY;
    }
  };

  // Handle Touch End
  const handleTouchEnd = () => {
    const deltaY = currentDragYRef.current;
    if (!isCollapsed && deltaY > 50) {
      // Swiped down: collapse into peek state so user knows it's still there
      setIsCollapsed(true);
    } else if (isCollapsed && deltaY < -40) {
      // Swiped up: expand back to full view
      setIsCollapsed(false);
    }
    touchStartYRef.current = null;
    currentDragYRef.current = 0;
    setDragOffset(0);
  };

  const handleOnlineClick = () => {
    if (onSelectOnline) {
      onSelectOnline();
    } else {
      console.log('[PaymentPanel] Online payment selected for document:', documentId);
      alert(`Online payment initiated for ₱${displayCost.toFixed(2)}`);
    }
  };

  const handleCoinslotClick = () => {
    if (onSelectCoinslot) {
      onSelectCoinslot();
    } else {
      console.log('[PaymentPanel] Coinslot payment selected for document:', documentId);
      alert(`Coinslot payment initiated for ₱${displayCost.toFixed(2)}`);
    }
  };

  return (
    <div
      data-testid="payment-panel-container"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[70] flex justify-center pointer-events-none select-none',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-[430px] flex justify-center pointer-events-none',
          animateEntrance && 'animate-slide-up'
        )}
      >
        <section
          role="region"
          aria-label="Payment Options Panel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: isCollapsed
              ? `translateY(calc(100% - 76px + ${Math.max(0, dragOffset)}px))`
              : `translateY(${Math.max(0, dragOffset)}px)`,
          }}
          className={cn(
            'pointer-events-auto w-full max-w-[430px] bg-[#34418E] rounded-t-[32px] sm:rounded-t-[36px]',
            'shadow-[0_-12px_45px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out z-[70]',
            'flex flex-col pt-3 pb-6 px-4 text-white will-change-transform'
          )}
        >
        {/* Drag Handle & Peek Bar Header */}
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex flex-col items-center justify-center cursor-pointer pb-2"
          role="button"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand payment panel' : 'Collapse payment panel'}
        >
          {/* Top Pill Handle */}
          <div className="w-14 h-1.5 bg-white/70 rounded-full mb-2 hover:bg-white transition-colors" />

          {/* Peek Bar Info (Visible when collapsed: Centered 'Tap or swipe up to pay') */}
          {isCollapsed && (
            <div className="w-full flex items-center justify-center py-1.5 animate-fadeIn">
              <div className="flex items-center justify-center gap-2 text-[14px] font-semibold text-white bg-white/15 hover:bg-white/20 active:scale-95 px-5 py-2 rounded-full transition-all shadow-sm">
                <span>Tap or swipe up to pay</span>
                <ChevronUp className="w-4 h-4 animate-bounce text-[#FDD41F]" />
              </div>
            </div>
          )}
        </div>

        {/* Expanded Panel Contents */}
        <div
          className={cn(
            'flex flex-col w-full transition-opacity duration-200',
            isCollapsed && 'opacity-0 pointer-events-none h-0 overflow-hidden'
          )}
        >
          {/* White Rectangular Card with costfacade.svg & Price */}
          <div className="w-full bg-white rounded-[22px] p-2.5 sm:p-3 relative overflow-hidden flex flex-col items-center justify-center shadow-lg">
            {/* costfacade.svg Illustration Container */}
            <div className="relative w-full h-[145px] sm:h-[160px] flex items-center justify-center">
              <Image
                src="/illustrations/costfacade.svg"
                alt="Cost facade illustration"
                fill
                className="object-contain"
                priority
              />

              {/* Price Centered Between The Two Individuals */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="flex items-center gap-1.5 text-[#2A2F3D] select-text">
                  <span className="text-[34px] sm:text-[38px] font-black leading-none">
                    ₱
                  </span>
                  <span
                    data-testid="payment-price-display"
                    className="text-[44px] sm:text-[50px] font-black tracking-tight leading-none"
                  >
                    {displayCost.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Dropdown Breakdown */}
          <div className="w-full mt-2.5 px-1">
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="w-full flex items-center justify-between text-[13px] font-medium text-white/80 hover:text-white py-1 px-1 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 opacity-80" />
                <span>
                  {displayPages} {displayPages === 1 ? 'page' : 'pages'} ({displayCopies} {displayCopies === 1 ? 'copy' : 'copies'}), {displayScheme}
                </span>
              </span>
              <span className="flex items-center gap-0.5 text-xs text-white/70">
                <span>{showBreakdown ? 'Hide details' : 'View breakdown'}</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    showBreakdown && 'rotate-180'
                  )}
                />
              </span>
            </button>

            {showBreakdown && (
              <div className="mt-2 bg-white/10 backdrop-blur-sm rounded-xl p-3 text-xs text-white/95 space-y-1.5 border border-white/15 animate-fadeIn">
                <div className="flex justify-between">
                  <span className="text-white/70">Paper Size:</span>
                  <span className="font-semibold">{paperSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Color Scheme:</span>
                  <span className="font-semibold">{displayScheme}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Total Copies:</span>
                  <span className="font-semibold">{displayCopies}</span>
                </div>
                {costSummary && costSummary.pageBreakdown && (
                  <div className="pt-2 border-t border-white/15 max-h-24 overflow-y-auto space-y-1">
                    {costSummary.pageBreakdown.map((page) => (
                      <div key={page.pageNumber} className="flex justify-between text-[11px]">
                        <span className="text-white/80">
                          Page {page.pageNumber} ({page.copies}x)
                        </span>
                        <span className="font-semibold">₱{page.totalPageCost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* "Choose mode of payment" Section Title */}
          <h2 className="text-white text-[15px] sm:text-[16px] font-semibold text-center mt-3.5 mb-3.5 tracking-wide">
            Choose mode of payment
          </h2>

          {/* Two Side-by-Side Payment Option Buttons */}
          <div className="grid grid-cols-2 gap-3.5 px-0.5">
            {/* 1. Online Payment Card Button */}
            <button
              type="button"
              onClick={handleOnlineClick}
              data-testid="payment-online-btn"
              className={cn(
                'bg-white rounded-[22px] p-3.5 sm:p-4 flex flex-col items-center justify-between',
                'shadow-lg hover:shadow-xl active:scale-[0.97] transition-all cursor-pointer min-h-[140px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#34418E]'
              )}
            >
              <div className="relative w-full h-[68px] sm:h-[72px] flex items-center justify-center">
                <Image
                  src="/illustrations/online.svg"
                  alt="Online payment"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-[#2A2F3D] font-bold text-[17px] sm:text-[18px] mt-1">
                Online
              </span>
            </button>

            {/* 2. Coinslot Payment Card Button */}
            <button
              type="button"
              onClick={handleCoinslotClick}
              data-testid="payment-coinslot-btn"
              className={cn(
                'bg-white rounded-[22px] p-3.5 sm:p-4 flex flex-col items-center justify-between',
                'shadow-lg hover:shadow-xl active:scale-[0.97] transition-all cursor-pointer min-h-[140px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#34418E]'
              )}
            >
              <div className="relative w-full h-[68px] sm:h-[72px] flex items-center justify-center">
                <Image
                  src="/illustrations/coinslot.svg"
                  alt="Coinslot payment"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-[#2A2F3D] font-bold text-[17px] sm:text-[18px] mt-1">
                Coinslot
              </span>
            </button>
          </div>

          {/* Footer */}
          <footer className="w-full text-center pt-5 pb-1">
            <p className="text-white/60 text-[13px] font-medium tracking-wide">
              Peso Print - 2026
            </p>
          </footer>
        </div>
      </section>
    </div>
  </div>
);
};
