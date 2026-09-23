'use client';

import React from 'react';
import { NavBar } from '@/components/common/nav-bar';
import { ModalPanel } from '@/components/common/modal-panel';
import { Button } from '@/components/common/button';

export interface KioskBusyViewProps {
  onRefresh?: () => void;
  onHelpClick?: () => void;
  isRefreshing?: boolean;
}

export const KioskBusyView: React.FC<KioskBusyViewProps> = ({
  onRefresh,
  onHelpClick,
  isRefreshing = false,
}) => {
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
        aria-label="Kiosk Busy Section"
        className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-6 z-10"
      >
        {/* Busy Modal Card */}
        <ModalPanel isClickable={false} className="max-w-[340px]">
          <ModalPanel.Icon
            src="busy.svg"
            alt="Kiosk Busy Illustration"
            className="w-36 h-36 mb-4"
          />
          <ModalPanel.Title>Kiosk Is Busy</ModalPanel.Title>
          <ModalPanel.Description>
            Someone else is using the kiosk for now. Please wait for a moment.
          </ModalPanel.Description>
        </ModalPanel>

        {/* Refresh Button floating below the modal card */}
        <div className="mt-8 flex justify-center w-full">
          <Button
            variant="primary"
            size="lg"
            isLoading={isRefreshing}
            onClick={onRefresh}
            className="min-w-[190px] text-[17px] font-bold py-3.5 px-8 rounded-[14px] shadow-[0_4px_14px_rgba(52,65,142,0.3)] active:scale-95 transition-all"
          >
            Refresh
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
