'use client';

import React from 'react';
import { NavBar } from '@/components/common/nav-bar';
import { ModalPanel } from '@/components/common/modal-panel';

export interface KioskMissingViewProps {
  onHelpClick?: () => void;
}

export const KioskMissingView: React.FC<KioskMissingViewProps> = ({ onHelpClick }) => {
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
        aria-label="Missing URL Section"
        className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-6 z-10"
      >
        {/* Missing Modal Card */}
        <ModalPanel isClickable={false} className="max-w-[340px]">
          <ModalPanel.Icon
            src="error.svg"
            alt="Missing Kiosk URL"
            className="w-36 h-36 mb-4"
          />
          <ModalPanel.Title>Missing Url</ModalPanel.Title>
          <ModalPanel.Description>
            Oops, we can’t find that url. Please ensure that you are using the correct kiosk ID
          </ModalPanel.Description>
        </ModalPanel>
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
