'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { NavBar } from '@/components/common/nav-bar';
import { Button } from '@/components/ui/button';

export type CommunicatingMode = 'coinslot' | 'online';

export interface CommunicatingLoadingViewProps {
  mode: CommunicatingMode;
  title?: string;
  description?: React.ReactNode;
  statusText?: string;
  progress?: number;
  autoSimulate?: boolean;
  onCancel: () => void;
  onComplete?: () => void;
  onLogoClick?: () => void;
  onQuestionClick?: () => void;
}

export const CommunicatingLoadingView: React.FC<CommunicatingLoadingViewProps> = ({
  mode,
  title = 'Communicating',
  description,
  statusText: propStatusText,
  progress: propProgress,
  autoSimulate = true,
  onCancel,
  onComplete,
  onLogoClick,
  onQuestionClick,
}) => {
  const [internalProgress, setInternalProgress] = useState<number>(propProgress ?? 0);
  const [internalStatus, setInternalStatus] = useState<string>(
    mode === 'coinslot' ? 'preparing stream tunnel to kiosk...' : 'initializing payment gateway...'
  );

  const completedRef = useRef(false);

  useEffect(() => {
    if (!autoSimulate || propProgress !== undefined) return;

    completedRef.current = false;
    const startTime = Date.now();
    const duration = 2800; // 2.8 seconds placeholder API communication

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setInternalProgress(pct);

      if (mode === 'coinslot') {
        if (pct < 30) {
          setInternalStatus('preparing stream tunnel to kiosk...');
        } else if (pct < 65) {
          setInternalStatus('sending file buffer...');
        } else if (pct < 90) {
          setInternalStatus('listening for coinslot events...');
        } else {
          setInternalStatus('kiosk ready (green light on)...');
        }
      } else {
        if (pct < 30) {
          setInternalStatus('initializing payment gateway...');
        } else if (pct < 65) {
          setInternalStatus('setting up PayMongo session...');
        } else if (pct < 90) {
          setInternalStatus('generating transaction token...');
        } else {
          setInternalStatus('payment gateway ready...');
        }
      }

      if (pct >= 100) {
        clearInterval(interval);
        if (!completedRef.current) {
          completedRef.current = true;
          // Small pause at 100% so user sees completion before transition
          setTimeout(() => {
            onComplete?.();
          }, 300);
        }
      }
    }, 80);

    return () => clearInterval(interval);
  }, [autoSimulate, mode, onComplete, propProgress]);

  const currentProgress = propProgress ?? internalProgress;
  const currentStatus = propStatusText ?? internalStatus;
  const clampedProgress = Math.min(100, Math.max(0, currentProgress));

  const defaultDescription =
    mode === 'coinslot' ? (
      <>
        Please wait while we communicate the data to your kiosk. Once done, the display should light{' '}
        <strong className="font-bold text-[#1E2026]">green</strong>, indicating that you can now insert coins.
      </>
    ) : (
      <>
        Please wait while we set up the online payment session. Once done, you will be able to select your e-wallet to
        pay.
      </>
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Communicating"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#E6E6E6] overflow-hidden select-none animate-fadeIn"
    >
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
      <div className="w-full z-10">
        <NavBar
          onLogoClick={onLogoClick || onCancel}
          onQuestionClick={onQuestionClick || (() => {})}
        />
      </div>

      {/* Center Section: Floating Card + Action Button */}
      <div className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 z-10">
        {/* Main Communicating Card */}
        <div className="w-full max-w-[340px] sm:max-w-[360px] bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-black/[0.04] px-6 py-8 flex flex-col items-center text-center">
          {/* Illustration */}
          <div className="relative w-[180px] h-[150px] mb-3">
            <Image
              src="/illustrations/communicating.svg"
              alt="Communicating Illustration"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Title */}
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#2A2F3D] mb-2 tracking-tight">
            {title}
          </h2>

          {/* Description */}
          <p className="text-[13px] sm:text-[14px] font-medium text-[#4B5563] leading-relaxed max-w-[270px] mb-5">
            {description ?? defaultDescription}
          </p>

          {/* Progress Bar Container */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(clampedProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full max-w-[190px] h-2.5 bg-[#E0E2EC] rounded-full overflow-hidden mb-2"
          >
            <div
              className="h-full bg-[#FDD41F] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>

          {/* Progress Status Message */}
          <p className="text-[12px] font-medium text-[#8C93A3] tracking-wide">
            {currentStatus}
          </p>
        </div>

        {/* Cancel Button below the Card */}
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={onCancel}
            data-testid="communicating-cancel-btn"
            className="w-[180px] h-[52px] rounded-[16px] text-[16px] font-bold shadow-[0_4px_16px_rgba(52,65,142,0.3)] hover:bg-[#28326D] active:scale-95 transition-all"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center pb-8 pt-2 z-10">
        <p className="text-[13px] font-medium text-[#7C808E] select-none tracking-wide">
          Peso Print - 2026
        </p>
      </footer>
    </div>
  );
};
