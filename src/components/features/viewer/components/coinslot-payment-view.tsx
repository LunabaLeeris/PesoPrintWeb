'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/common/nav-bar';
import { Button } from '@/components/ui/button';
import { DocumentCostSummary } from '@/services/cost-service';
import { DocumentRow } from '@/types';
import { cn } from '@/lib/utils';
import { isPaymentDisabled } from '@/lib/env';
import { CommunicatingLoadingView } from './communicating-loading-view';

export interface CoinslotPaymentViewProps {
  kioskId: string;
  documentId: string;
  initialDocument?: DocumentRow | null;
  cost?: number;
  totalPages?: number;
  totalCopies?: number;
  colorScheme?: string;
  paperSize?: string;
  onBack?: () => void;
  isCommunicating?: boolean;
  onCommunicatingComplete?: () => void;
}

export const CoinslotPaymentView: React.FC<CoinslotPaymentViewProps> = ({
  kioskId,
  documentId,
  initialDocument,
  cost: propCost,
  totalPages: propTotalPages,
  totalCopies: propTotalCopies,
  colorScheme = 'B&W',
  paperSize = 'A4',
  onBack,
  isCommunicating: propIsCommunicating,
  onCommunicatingComplete,
}) => {
  const router = useRouter();
  const [costSummary, setCostSummary] = useState<DocumentCostSummary | null>(null);
  const [isCommunicating, setIsCommunicating] = useState<boolean>(propIsCommunicating ?? false);

  // 1 minute and 32 seconds countdown (92s) as seen in design
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

  const navigateToSuccess = () => {
    const searchParams = new URLSearchParams();
    if (propCost !== undefined) searchParams.set('cost', propCost.toString());
    if (propTotalPages !== undefined) searchParams.set('pages', propTotalPages.toString());
    if (propTotalCopies !== undefined) searchParams.set('copies', propTotalCopies.toString());
    if (colorScheme) searchParams.set('scheme', colorScheme);
    if (paperSize) searchParams.set('paper', paperSize);

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    router.push(`/kiosk/${kioskId}/document_viewer/${documentId}/payment/success${queryString}`);
  };

  if (isCommunicating) {
    return (
      <CommunicatingLoadingView
        mode="coinslot"
        onCancel={handleBack}
        onComplete={() => {
          setIsCommunicating(false);
          onCommunicatingComplete?.();
        }}
      />
    );
  }

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
          onLogoClick={handleBack}
          onQuestionClick={() => alert('Need assistance? Please ask the kiosk attendant or tap help.')}
          showAlertButton
          onAlertClick={() => alert('Session Alert: Please insert your coins before the timer expires.')}
        />

        {/* Expiry Notification Sub-text (closer to nav bar) */}
        <div className="w-full max-w-[430px] mx-auto text-center pt-2.5 pb-1 px-4 z-10">
          <p className="text-[13px] sm:text-[14px] font-medium text-[#7C808E] select-none">
            This session will expire in{' '}
            <span className="text-[#C92A2A] font-semibold">{formatTime(timeLeft)}</span>
          </p>
        </div>
      </div>

      {/* Main Content Modal Card: Stretched height closer to the nav bar as in mockup */}
      <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col z-10 animate-slide-up mt-1.5 sm:mt-2">
        <section
          role="region"
          aria-label="Coinslot Payment"
          className={cn(
            'w-full flex-1 min-h-0 bg-white rounded-t-[32px] sm:rounded-t-[36px]',
            'shadow-[0_-12px_45px_rgba(0,0,0,0.12)] border-t border-black/[0.04]',
            'flex flex-col items-center justify-between px-6 pt-5 pb-4 overflow-y-auto'
          )}
        >
          {/* Cost Facade Card with Price */}
          <div
            onClick={isPaymentDisabled() ? navigateToSuccess : undefined}
            className={cn(
              "relative w-full h-[135px] sm:h-[155px] shrink-0 flex items-center justify-center",
              isPaymentDisabled() && "cursor-pointer active:scale-95 transition-transform"
            )}
          >
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
                <span className="text-[32px] sm:text-[36px] font-black leading-none">
                  ₱
                </span>
                <span
                  data-testid="coinslot-price-display"
                  className="text-[42px] sm:text-[48px] font-black tracking-tight leading-none"
                >
                  {displayCost.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Illustration below the cost using defaultimage.svg */}
          <div
            onClick={isPaymentDisabled() ? navigateToSuccess : undefined}
            className={cn(
              "relative w-full max-w-[290px] sm:max-w-[320px] h-[175px] sm:h-[195px] shrink-0 flex items-center justify-center my-1.5 sm:my-2",
              isPaymentDisabled() && "cursor-pointer active:scale-95 transition-transform"
            )}
          >
            <Image
              src="/illustrations/defaultimage.svg"
              alt="Coinslot payment kiosk"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Instructions: Insert Coins & Warnings */}
          <div className="w-full flex flex-col items-center text-center shrink-0">
            <h2 className="text-[20px] sm:text-[22px] font-bold text-[#2A2F3D] tracking-tight mb-1">
              Insert Coins
            </h2>
            <div className="text-[13px] sm:text-[14px] leading-snug text-[#2A2F3D]">
              <p className="font-medium text-[#2A2F3D]">
                Please insert the exact amount above.
              </p>
              <p className="font-bold text-[#C92A2A] mt-0.5">
                Note that this kiosk does not give
                <br />
                any change.
              </p>
            </div>
          </div>

          {/* Cancel Button: uses @/components/ui/button */}
          <div className="w-full flex justify-center mt-3 sm:mt-4 shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={handleBack}
              data-testid="coinslot-cancel-btn"
              className="w-[180px] sm:w-[200px] h-[52px] sm:h-[56px] rounded-[18px] text-[16px] sm:text-[17px] font-bold shadow-[0_4px_16px_rgba(52,65,142,0.3)] hover:bg-[#28326D] active:scale-95 transition-all"
            >
              Cancel
            </Button>
          </div>

          {/* Footer Branding */}
          <footer className="w-full text-center pt-2.5 pb-1 shrink-0">
            <p className="text-[13px] font-medium text-[#7C808E] select-none tracking-wide">
              Peso Print - 2026
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
};
