'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { NavBar } from '@/components/common/nav-bar';
import { PrintPairCard, PrintPairItem } from './print-pair-card';
import { cn } from '@/lib/utils';

export interface ReprintReasonsViewProps {
  selectedPairs: PrintPairItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
  onCancel: () => void;
  onSubmit: (reasonsMap: Record<string, string[]>) => void;
}

const DEFAULT_REASONS = [
  'Ink / Toner defects',
  'Misalignment / Cutoff',
  'Wrong orientation or layout',
  'Wrong paper size',
  'Smudges or streaks',
  'Faded or unreadable text',
  'Paper feed wrinkle or fold',
];

export const ReprintReasonsView: React.FC<ReprintReasonsViewProps> = ({
  selectedPairs,
  pdfDoc,
  onCancel,
  onSubmit,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Map of pairId -> selected reason strings
  const [reasonsMap, setReasonsMap] = useState<Record<string, string[]>>({});

  // 1. Session Expiry Countdown (92s matching "1 minute and 32 seconds")
  const [timeLeft, setTimeLeft] = useState<number>(92);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const minText = mins === 1 ? '1 minute' : `${mins} minutes`;
    const secText = `${secs} seconds`;
    if (mins > 0) {
      return `${minText} and ${secText}`;
    }
    return `${secs} seconds`;
  };

  const currentPair = selectedPairs[currentIndex] || selectedPairs[0];
  const isLastPair = currentIndex === selectedPairs.length - 1;
  const currentPairReasons = reasonsMap[currentPair?.id] || [];

  // Toggle reason for the active pair
  const handleToggleReason = (reason: string) => {
    if (!currentPair) return;
    setReasonsMap((prev) => {
      const existing = prev[currentPair.id] || [];
      const updated = existing.includes(reason)
        ? existing.filter((r) => r !== reason)
        : [...existing, reason];
      return { ...prev, [currentPair.id]: updated };
    });
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      onCancel();
    }
  };

  const handleNextOrReprint = () => {
    if (!isLastPair) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onSubmit(reasonsMap);
    }
  };

  if (!currentPair) return null;

  return (
    <main className="relative h-screen h-[100dvh] max-h-screen w-full bg-[#E6E6E6] flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="w-full h-full max-w-[430px] bg-top bg-no-repeat bg-cover opacity-90"
          style={{
            backgroundImage: "url('/background.svg')",
            backgroundSize: '100% auto',
          }}
        />
      </div>

      {/* Top Header Navbar */}
      <div className="w-full shrink-0 z-20">
        <NavBar
          showAlertButton
          onAlertClick={() => alert('Please select the defects observed on your printed page.')}
          onQuestionClick={() => alert('Need assistance? Please ask the kiosk attendant or tap help.')}
        />

        {/* Expiry Notification Sub-text */}
        <div className="w-full max-w-[430px] mx-auto text-center pt-2 pb-1 px-4 z-10">
          <p className="text-[13px] sm:text-[14px] font-medium text-[#7C808E] select-none">
            This session will expire in{' '}
            <span className="text-[#DC2626] font-semibold">{formatTime(timeLeft)}</span>
          </p>
        </div>
      </div>

      {/* Single Cancel Button placed on the LEFT edge as requested */}
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel reprint reasons"
        className={cn(
          'fixed left-0 z-50 transition-all duration-150 select-none cursor-pointer',
          'top-[180px] sm:top-[190px]',
          'bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white',
          'rounded-r-[18px] sm:rounded-r-[20px] rounded-l-none border-y border-r border-[#B91C1C]',
          'shadow-[2px_4px_18px_rgba(220,38,38,0.35)]',
          'flex items-center justify-center p-3 sm:p-3.5'
        )}
      >
        <X className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Main Content Modal Card */}
      <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col z-10 animate-slide-up mt-1.5 sm:mt-2 relative">
        <section
          role="region"
          aria-label="Reprint Reasons Questionnaire"
          className={cn(
            'w-full flex-1 min-h-0 bg-white rounded-t-[32px] sm:rounded-t-[36px]',
            'shadow-[0_-12px_45px_rgba(0,0,0,0.12)] border-t border-black/[0.04]',
            'flex flex-col justify-between px-4 sm:px-6 pt-5 pb-6 sm:pb-8 relative overflow-hidden'
          )}
        >
          {/* 1. Current Pair Card Preview: FIXED at top (DOES NOT SCROLL) */}
          <div className="w-full shrink-0 mb-3">
            <PrintPairCard pair={currentPair} pdfDoc={pdfDoc} />
          </div>

          {/* 2. Standalone Scrollable Section for Reasons Checkboxes ONLY */}
          <div className="w-full flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col divide-y divide-[#E5E7EB] border-t border-b border-[#E5E7EB]">
            {DEFAULT_REASONS.map((reason) => {
              const isChecked = currentPairReasons.includes(reason);
              return (
                <div
                  key={reason}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={0}
                  onClick={() => handleToggleReason(reason)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggleReason(reason);
                    }
                  }}
                  className={cn(
                    'w-full py-3.5 px-2 flex items-center justify-between cursor-pointer select-none',
                    'transition-colors duration-150 hover:bg-[#F9FAFB] active:bg-[#F3F4F6]'
                  )}
                >
                  <span className="text-[14px] sm:text-[15px] font-medium text-[#374151]">
                    {reason}
                  </span>

                  {/* Checkbox indicator matching Image A */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-[4px] flex items-center justify-center transition-all duration-150 shrink-0',
                      isChecked
                        ? 'bg-[#22C55E] text-white shadow-xs'
                        : 'border-2 border-[#CBD0DC] bg-white'
                    )}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Bottom Navigation Controls (Back, Counter, Next/Reprint) */}
          <div className="w-full pt-4 border-t border-[#E5E7EB] flex items-center justify-between shrink-0">
            {/* Back Button */}
            <button
              type="button"
              onClick={handleBack}
              className={cn(
                'min-w-[90px] sm:min-w-[100px] h-[46px] rounded-[12px] font-bold text-[15px]',
                'bg-[#FDD41F] hover:bg-[#EAB308] active:scale-95 text-[#1E2026]',
                'shadow-[0_2px_8px_rgba(253,212,31,0.3)] transition-all'
              )}
            >
              Back
            </button>

            {/* Step Counter Indicator (e.g. 3/5) */}
            <span className="text-[15px] sm:text-[16px] font-semibold text-[#4B5563] tracking-wide">
              {currentIndex + 1}/{selectedPairs.length}
            </span>

            {/* Next or Reprint Button */}
            <button
              type="button"
              onClick={handleNextOrReprint}
              className={cn(
                'min-w-[90px] sm:min-w-[100px] h-[46px] rounded-[12px] font-bold text-[15px]',
                'bg-[#34418E] hover:bg-[#28326D] active:scale-95 text-white',
                'shadow-[0_2px_8px_rgba(52,65,142,0.3)] transition-all'
              )}
            >
              {isLastPair ? 'Reprint' : 'Next'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};
