'use client';

import React, { useState } from 'react';
import { NavBar } from '@/components/common/nav-bar';
import { ModalPanel } from '@/components/common/modal-panel';
import { Button } from '@/components/common/button';

export interface KioskOfflineViewProps {
  message?: string;
  onRefresh?: () => void;
  onHelpClick?: () => void;
  isRefreshing?: boolean;
}

export const KioskOfflineView: React.FC<KioskOfflineViewProps> = ({
  message,
  onRefresh,
  onHelpClick,
  isRefreshing: controlledIsRefreshing,
}) => {
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const isRefreshing = controlledIsRefreshing ?? internalRefreshing;

  const handleRetry = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      setInternalRefreshing(true);
      window.location.reload();
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#E6E6E6] flex flex-col items-center justify-between overflow-x-hidden">
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

      {/* Top Navigation Bar */}
      <NavBar onQuestionClick={onHelpClick} />

      {/* Center Section */}
      <section
        aria-label="Kiosk Offline Section"
        className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-6 z-10"
      >
        {/* Offline Modal Card */}
        <ModalPanel isClickable={false} className="max-w-[340px]">
          <ModalPanel.Icon
            src="error.svg"
            alt="Printer Offline Illustration"
            className="w-36 h-36 mb-4"
          />
          <ModalPanel.Title>Printer Offline</ModalPanel.Title>
          <ModalPanel.Description>
            {message ||
              'The kiosk printer is currently unavailable or unreachable. Please ensure the kiosk is powered on and connected, then try again.'}
          </ModalPanel.Description>
        </ModalPanel>

        {/* Retry / Refresh Button floating below the modal card */}
        <div className="mt-8 flex justify-center w-full">
          <Button
            variant="primary"
            size="lg"
            isLoading={isRefreshing}
            onClick={handleRetry}
            className="min-w-[190px] text-[17px] font-bold py-3.5 px-8 rounded-[14px] shadow-[0_4px_14px_rgba(52,65,142,0.3)] active:scale-95 transition-all"
          >
            Try Again
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center pb-8 pt-2 z-10">
        <p className="text-[13px] font-medium text-[#7C808E] select-none tracking-wide">
          Peso Print - 2026
        </p>
      </footer>
    </main>
  );
};
