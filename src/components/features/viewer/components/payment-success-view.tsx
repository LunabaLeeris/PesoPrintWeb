'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/common/nav-bar';
import { cn } from '@/lib/utils';

export interface PaymentSuccessViewProps {
  kioskId: string;
  documentId: string;
  cost?: number;
  totalPages?: number;
  totalCopies?: number;
  colorScheme?: string;
  paperSize?: string;
  onComplete?: () => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  kioskId,
  documentId,
  cost,
  totalPages,
  totalCopies,
  colorScheme = 'B&W',
  paperSize = 'A4',
  onComplete,
}) => {
  const router = useRouter();
  const [statusText, setStatusText] = useState('locating printer...');

  useEffect(() => {
    // Setup placeholder loading states for locating the kiosk & initiating print
    const t1 = setTimeout(() => {
      setStatusText('checking kiosk status...');
    }, 1000);

    const t2 = setTimeout(() => {
      setStatusText('establishing stream tunnel...');
    }, 2000);

    const t3 = setTimeout(() => {
      setStatusText('printer located! Preparing print job...');
    }, 3000);

    const t4 = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        const searchParams = new URLSearchParams();
        if (cost !== undefined) searchParams.set('cost', cost.toString());
        if (totalPages !== undefined) searchParams.set('pages', totalPages.toString());
        if (totalCopies !== undefined) searchParams.set('copies', totalCopies.toString());
        if (colorScheme) searchParams.set('scheme', colorScheme);
        if (paperSize) searchParams.set('paper', paperSize);

        const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
        router.push(`/kiosk/${kioskId}/printing/${documentId}${queryString}`);
      }
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [kioskId, documentId, cost, totalPages, totalCopies, colorScheme, paperSize, onComplete, router]);

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
          onQuestionClick={() => alert('Need assistance? Please ask the kiosk attendant or tap help.')}
        />
      </div>

      {/* Main Content Modal Card: Stretched height closer to nav bar */}
      <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col z-10 animate-slide-up mt-4 sm:mt-6">
        <section
          role="region"
          aria-label="Payment Successful"
          className={cn(
            'w-full flex-1 min-h-0 bg-white rounded-t-[32px] sm:rounded-t-[36px]',
            'shadow-[0_-12px_45px_rgba(0,0,0,0.12)] border-t border-black/[0.04]',
            'flex flex-col items-center justify-start px-6 pt-10 sm:pt-14 pb-8 overflow-y-auto'
          )}
        >
          {/* Success Man with Thumbs-up Illustration */}
          <div className="relative w-[150px] sm:w-[170px] h-[210px] sm:h-[240px] shrink-0 flex items-center justify-center mb-6 sm:mb-8">
            <Image
              src="/illustrations/success.svg"
              alt="Payment Successful"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Title */}
          <h2 className="text-[22px] sm:text-[24px] font-bold text-[#2A2F3D] tracking-tight mb-2 text-center">
            Payment Succesful
          </h2>

          {/* Description */}
          <p className="text-[13px] sm:text-[14px] font-medium text-[#4B5563] text-center max-w-[270px] leading-relaxed mb-6 sm:mb-8">
            We successfully received your payment! Please wait while we instruct the kiosk for printing.
          </p>

          {/* Placeholder Loading Status */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <p className="text-[13px] font-medium text-[#8C93A3] tracking-wide animate-pulse">
              {statusText}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
