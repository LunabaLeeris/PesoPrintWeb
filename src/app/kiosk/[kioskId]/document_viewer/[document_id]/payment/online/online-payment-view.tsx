'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/common/nav-bar';
import { Button } from '@/components/ui/button';
import { DocumentCostSummary } from '@/services/cost-service';
import { DocumentRow } from '@/types';
import { cn } from '@/lib/utils';

export interface OnlinePaymentViewProps {
  kioskId: string;
  documentId: string;
  initialDocument?: DocumentRow | null;
  cost?: number;
  totalPages?: number;
  totalCopies?: number;
  colorScheme?: string;
  paperSize?: string;
  onSelectGcash?: () => void;
  onSelectMaya?: () => void;
  onBack?: () => void;
}

export const OnlinePaymentView: React.FC<OnlinePaymentViewProps> = ({
  kioskId,
  documentId,
  initialDocument,
  cost: propCost,
  totalPages: propTotalPages,
  totalCopies: propTotalCopies,
  colorScheme = 'B&W',
  paperSize = 'A4',
  onSelectGcash,
  onSelectMaya,
  onBack,
}) => {
  const router = useRouter();
  const [costSummary, setCostSummary] = useState<DocumentCostSummary | null>(null);

  // 1 minute and 32 seconds countdown (92s)
  const [timeLeft, setTimeLeft] = useState<number>(92);

  useEffect(() => {
    if (!documentId) return;
    try {
      const stored = sessionStorage.getItem(`cost_summary_${documentId}`);
      if (stored) {
        setCostSummary(JSON.parse(stored) as DocumentCostSummary);
      }
    } catch {
      // Ignore sessionStorage read errors
    }
  }, [documentId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0 seconds';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'} and ${secs} ${secs === 1 ? 'second' : 'seconds'}`;
    }
    return `${secs} ${secs === 1 ? 'second' : 'seconds'}`;
  };

  const displayCost = costSummary?.totalCost ?? propCost ?? 72;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      const searchParams = new URLSearchParams();
      if (propCost !== undefined) searchParams.set('cost', propCost.toString());
      if (propTotalPages !== undefined) searchParams.set('pages', propTotalPages.toString());
      if (propTotalCopies !== undefined) searchParams.set('copies', propTotalCopies.toString());
      if (colorScheme) searchParams.set('scheme', colorScheme);
      if (paperSize) searchParams.set('paper', paperSize);

      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      router.push(`/kiosk/${kioskId}/document_viewer/${documentId}/payment${queryString}`);
    }
  };

  const handleSelectGcash = () => {
    if (onSelectGcash) {
      onSelectGcash();
    } else {
      console.log('[OnlinePayment] GCash selected for document:', documentId, 'cost:', displayCost);
      alert(`Proceeding to GCash payment for ₱${displayCost.toFixed(2)}`);
    }
  };

  const handleSelectMaya = () => {
    if (onSelectMaya) {
      onSelectMaya();
    } else {
      console.log('[OnlinePayment] Maya selected for document:', documentId, 'cost:', displayCost);
      alert(`Proceeding to Maya payment for ₱${displayCost.toFixed(2)}`);
    }
  };

  return (
    <main className="relative h-screen h-[100dvh] max-h-screen w-full bg-[#E6E6E6] flex flex-col justify-between items-center overflow-hidden select-none">
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

      {/* Top Header Navbar with Red Alert button and Question Help button */}
      <div className="w-full shrink-0 z-20">
        <NavBar
          onLogoClick={handleBack}
          onQuestionClick={() => alert('Need assistance? Please ask the kiosk attendant or tap help.')}
          showAlertButton
          onAlertClick={() => alert('Session Alert: Please complete your payment before the timer expires.')}
        />

        {/* Expiry Notification Sub-text */}
        <div className="w-full max-w-[430px] mx-auto text-center pt-3 pb-2 px-4 z-10">
          <p className="text-[13px] sm:text-[14px] font-medium text-[#7C808E] select-none">
            This session will expire in{' '}
            <span className="text-[#C92A2A] font-semibold">{formatTime(timeLeft)}</span>
          </p>
        </div>
      </div>

      {/* Main Content Modal Card (Slide Up Entrance) */}
      <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col justify-end z-10 animate-slide-up">
        <section
          role="region"
          aria-label="Online Payment Options"
          className={cn(
            'w-full bg-white rounded-t-[32px] sm:rounded-t-[36px]',
            'shadow-[0_-12px_45px_rgba(0,0,0,0.12)] border-t border-black/[0.04]',
            'flex flex-col items-center justify-between px-6 pt-5 pb-6'
          )}
        >
          {/* Cost Facade Card with Price */}
          <div className="relative w-full h-[140px] sm:h-[155px] flex items-center justify-center">
            <Image
              src="/illustrations/costfacade.svg"
              alt="Cost facade illustration"
              fill
              className="object-contain"
              priority
            />

            {/* Price Centered Between The Two People */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="flex items-center gap-1.5 text-[#2A2F3D] select-text">
                <span className="text-[34px] sm:text-[38px] font-black leading-none">
                  ₱
                </span>
                <span
                  data-testid="online-price-display"
                  className="text-[44px] sm:text-[50px] font-black tracking-tight leading-none"
                >
                  {displayCost.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Action Cards */}
          <div className="w-full flex flex-col gap-3.5 sm:gap-4 mt-4">
            {/* 1. GCash Button */}
            <button
              type="button"
              onClick={handleSelectGcash}
              data-testid="online-gcash-btn"
              aria-label="Open in GCash"
              className={cn(
                'w-full h-[96px] sm:h-[104px] rounded-[20px] sm:rounded-[22px] overflow-hidden flex border border-[#E5E7EB]',
                'shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer bg-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007DFE]'
              )}
            >
              {/* Left Side: Open in Gcash */}
              <div className="w-1/2 h-full bg-white flex flex-col items-center justify-center py-2 px-3 select-none">
                <span className="text-[#4B5563] text-[15px] sm:text-[16px] font-medium leading-tight">
                  Open in
                </span>
                <span className="text-[#007DFE] text-[18px] sm:text-[20px] font-extrabold leading-tight mt-0.5">
                  Gcash
                </span>
              </div>

              {/* Right Side: GCash Logo */}
              <div className="w-1/2 h-full bg-[#007DFE] relative flex items-center justify-center p-2 select-none">
                <Image
                  src="/images/gcash.png"
                  alt="GCash Logo"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
            </button>

            {/* 2. Maya Button */}
            <button
              type="button"
              onClick={handleSelectMaya}
              data-testid="online-maya-btn"
              aria-label="Open in Maya"
              className={cn(
                'w-full h-[96px] sm:h-[104px] rounded-[20px] sm:rounded-[22px] overflow-hidden flex border border-[#E5E7EB]',
                'shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer bg-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D665]'
              )}
            >
              {/* Left Side: Open in Maya */}
              <div className="w-1/2 h-full bg-white flex flex-col items-center justify-center py-2 px-3 select-none">
                <span className="text-[#4B5563] text-[15px] sm:text-[16px] font-medium leading-tight">
                  Open in
                </span>
                <span className="text-[#1E2026] text-[18px] sm:text-[20px] font-extrabold leading-tight mt-0.5">
                  Maya
                </span>
              </div>

              {/* Right Side: Maya Logo */}
              <div className="w-1/2 h-full bg-[#050811] relative flex items-center justify-center p-2 select-none">
                <Image
                  src="/images/maya.png"
                  alt="Maya Logo"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
            </button>
          </div>

          {/* Cancel Button: uses @/components/ui/button */}
          <div className="w-full flex justify-center mt-6">
            <Button
              variant="primary"
              size="lg"
              onClick={handleBack}
              data-testid="online-cancel-btn"
              className="w-[180px] sm:w-[200px] h-[50px] sm:h-[54px] rounded-[16px] sm:rounded-[18px] text-[16px] sm:text-[17px] font-bold shadow-[0_4px_16px_rgba(52,65,142,0.3)] hover:bg-[#28326D] active:scale-95 transition-all"
            >
              Cancel
            </Button>
          </div>

          {/* Footer Branding */}
          <footer className="w-full text-center pt-4 pb-1">
            <p className="text-[13px] font-medium text-[#7C808E] select-none tracking-wide">
              Peso Print - 2026
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
};
