'use client';

import React from 'react';
import Image from 'next/image';
import { NavBar } from '@/components/common/nav-bar';

export interface AnalyzingCostViewProps {
  progress?: number;
  statusText?: string;
  onCancel: () => void;
  onLogoClick?: () => void;
  onQuestionClick?: () => void;
}

export const AnalyzingCostView: React.FC<AnalyzingCostViewProps> = ({
  progress = 0,
  statusText = 'reading rgb distribution...',
  onCancel,
  onLogoClick,
  onQuestionClick,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Analyzing Cost"
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

      {/* Center Section: White Card + Action Button */}
      <div className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 z-10">
        {/* Main Analyzing Card */}
        <div className="w-full max-w-[340px] sm:max-w-[360px] bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-black/[0.04] px-6 py-8 flex flex-col items-center text-center">
          {/* Illustration */}
          <div className="relative w-[180px] h-[155px] mb-3">
            <Image
              src="/illustrations/calculate.svg"
              alt="Analyzing Cost Illustration"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Title */}
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#2A2F3D] mb-2 tracking-tight">
            Analyzing Cost
          </h2>

          {/* Description */}
          <p className="text-[13px] sm:text-[14px] font-medium text-[#5A6072] leading-relaxed max-w-[240px] mb-5">
            Please stay on the page while we calculate the cost and make sure that your data is on
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
            {statusText}
          </p>
        </div>

        {/* Cancel Button below the Card */}
        <div className="mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="w-[180px] bg-[#34418E] hover:bg-[#2B3677] active:scale-[0.98] text-white font-bold text-[16px] py-3.5 rounded-[16px] shadow-[0_4px_16px_rgba(52,65,142,0.3)] transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34418E] focus-visible:ring-offset-2"
          >
            Cancel
          </button>
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
