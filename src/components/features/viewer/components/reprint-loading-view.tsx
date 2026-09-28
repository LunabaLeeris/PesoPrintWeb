'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NavBar } from '@/components/common/nav-bar';
import { ModalPanel } from '@/components/common/modal-panel';
import { Button } from '@/components/ui/button';

export interface ReprintLoadingViewProps {
  onCancel: () => void;
  onComplete: () => void;
}

export const ReprintLoadingView: React.FC<ReprintLoadingViewProps> = ({
  onCancel,
  onComplete,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Reading file 1 (1)');
  const isCompletedRef = useRef<boolean>(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Run progress timer ONCE on mount; never restarts on re-renders
  useEffect(() => {
    isCompletedRef.current = false;
    const startTime = Date.now();
    const duration = 2800; // 2.8s total loading animation

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 30) {
        setStatusText('Reading file 1 (1)');
      } else if (pct < 65) {
        setStatusText('Analyzing scan quality on ML model...');
      } else if (pct < 95) {
        setStatusText('Evaluating defect reasons with ML model...');
      } else {
        setStatusText('Decision finalized.');
      }

      if (pct >= 100) {
        clearInterval(timer);
        if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          onCompleteRef.current();
        }
      }
    }, 40);

    return () => {
      clearInterval(timer);
    };
  }, []);

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

      {/* Center Section: Floating ModalPanel Card + Action Button */}
      <div className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 z-10 animate-slide-up">
        {/* Main Requesting Card using ModalPanel */}
        <ModalPanel
          illustration="/illustrations/communicating.svg"
          illustrationAlt="Requesting Reprint"
          title="Requesting"
          description="Please wait while we process the documents for reprinting. This may take time."
          className="w-full max-w-[340px] sm:max-w-[360px] py-8 sm:py-9 px-6 bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-black/[0.04]"
        >
          {/* Progress Bar Container matching other loading pages */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full max-w-[190px] h-2.5 bg-[#E0E2EC] rounded-full overflow-hidden mt-3 mb-2"
          >
            <div
              className="h-full bg-[#FDD41F] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Animated Status Text */}
          <div className="flex flex-col items-center">
            <p className="text-[12px] sm:text-[13px] font-medium text-[#8C93A3] tracking-wide animate-pulse">
              {statusText}
            </p>
          </div>
        </ModalPanel>

        {/* Cancel Button below the card (centered) */}
        <div className="w-full max-w-[340px] sm:max-w-[360px] mt-6 flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={onCancel}
            className="w-[180px] sm:w-[200px] h-[50px] rounded-[18px] text-[16px] font-bold bg-[#34418E] text-white hover:bg-[#28326D] active:scale-95 shadow-[0_4px_16px_rgba(52,65,142,0.25)] border-none"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="w-full text-center pb-8 pt-2 z-10">
        <p className="text-[13px] font-medium text-[#7C808E] select-none tracking-wide">
          Peso Print - 2026
        </p>
      </footer>
    </main>
  );
};
