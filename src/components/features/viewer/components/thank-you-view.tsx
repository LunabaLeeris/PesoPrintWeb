'use client';

import React from 'react';
import Image from 'next/image';
import { NavBar } from '@/components/common/nav-bar';
import { Button } from '@/components/ui/button';

export interface ThankYouViewProps {
  kioskId?: string;
  onPrintMore: () => void;
}

export const ThankYouView: React.FC<ThankYouViewProps> = ({
  onPrintMore,
}) => {
  return (
    <main className="relative h-screen h-[100dvh] max-h-screen w-full bg-[#E6E6E6] flex flex-col items-center justify-start overflow-hidden select-none">
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
          onAlertClick={() => alert('Thank you for using Peso Print! Please collect your printed documents.')}
          onQuestionClick={() => alert('Need assistance? Please ask the kiosk attendant or tap help.')}
        />
      </div>

      {/* Main Content Modal Card - maximized down to the bottom of the page */}
      <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col z-10 animate-slide-up mt-2 sm:mt-3">
        <section
          role="region"
          aria-label="Thank you for using Peso Print"
          className="w-full flex-1 min-h-0 bg-white rounded-t-[32px] sm:rounded-t-[36px] shadow-[0_-12px_45px_rgba(0,0,0,0.12)] border-t border-black/[0.04] flex flex-col items-center justify-start px-6 pt-10 sm:pt-14 pb-10 overflow-y-auto"
        >
          {/* Centered Success / Thumbs-up Illustration */}
          <div className="relative w-[144px] h-[252px] shrink-0 flex items-center justify-center select-none">
            <Image
              src="/illustrations/success.svg"
              alt="Thank you illustration"
              width={144}
              height={252}
              priority
              className="object-contain pointer-events-none"
            />
          </div>

          {/* Heading */}
          <h1 className="text-[22px] sm:text-[24px] font-bold text-[#1E2026] text-center mt-6 sm:mt-7 tracking-tight select-none">
            Thank you
          </h1>

          {/* Message Description */}
          <p className="text-[13.5px] sm:text-[14.5px] font-normal text-[#4B5263] text-center leading-relaxed mt-2.5 max-w-[280px] sm:max-w-[310px] select-none">
            Thank you for using peso print.
            <br />
            Come again next time. Click print more
            <br />
            and scan the qr code again to reset
            <br />
            your instance.
          </p>

          {/* Print more Button */}
          <div className="mt-10 sm:mt-14 shrink-0 flex justify-center w-full">
            <Button
              type="button"
              onClick={onPrintMore}
              className="w-[180px] sm:w-[195px] h-[52px] rounded-[16px] sm:rounded-[18px] bg-[#34418E] hover:bg-[#28326D] active:scale-95 text-white font-bold text-[17px] sm:text-[18px] shadow-[0_4px_16px_rgba(52,65,142,0.3)] transition-all cursor-pointer"
            >
              Print more
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};
