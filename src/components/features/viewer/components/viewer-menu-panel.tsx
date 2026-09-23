'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ViewerMenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOrganizePages?: () => void;
  onCancelClick?: () => void;
  onPrint?: () => void;
  paperSize?: string;
  onPaperSizeChange?: (size: string) => void;
  orientation?: string;
  onOrientationChange?: (orientation: string) => void;
  colorScheme?: string;
  onColorSchemeChange?: (scheme: string) => void;
  className?: string;
}

export const PAPER_SIZE_OPTIONS = ['A4', 'Letter', 'Legal', 'A3', 'A5'];
export const ORIENTATION_OPTIONS = ['Portrait', 'Landscape'];
export const COLOR_SCHEME_OPTIONS = ['B&W', 'Color'];

export const ViewerMenuPanel: React.FC<ViewerMenuPanelProps> = ({
  isOpen,
  onClose,
  onOrganizePages,
  onCancelClick,
  onPrint,
  paperSize: controlledPaperSize,
  onPaperSizeChange,
  orientation: controlledOrientation,
  onOrientationChange,
  colorScheme: controlledColorScheme,
  onColorSchemeChange,
  className,
}) => {
  // Local state for uncontrolled usage
  const [localPaperSize, setLocalPaperSize] = useState('A4');
  const [localOrientation, setLocalOrientation] = useState('Portrait');
  const [localColorScheme, setLocalColorScheme] = useState('B&W');

  const currentPaperSize = controlledPaperSize ?? localPaperSize;
  const currentOrientation = controlledOrientation ?? localOrientation;
  const currentColorScheme = controlledColorScheme ?? localColorScheme;

  const handlePaperSizeChange = (val: string) => {
    setLocalPaperSize(val);
    onPaperSizeChange?.(val);
  };

  const handleOrientationChange = (val: string) => {
    setLocalOrientation(val);
    onOrientationChange?.(val);
  };

  const handleColorSchemeChange = (val: string) => {
    setLocalColorScheme(val);
    onColorSchemeChange?.(val);
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        data-testid="viewer-menu-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Side Panel Drawer */}
      <aside
        data-testid="viewer-menu-panel"
        aria-label="Viewer Menu Panel"
        aria-hidden={!isOpen}
        className={cn(
          'fixed right-0 top-[170px] bottom-0 z-100',
          'w-[75%] sm:w-[320px] max-w-[360px] min-w-[270px]',
          'bg-[#34418E] text-white shadow-[-8px_0_30px_rgba(0,0,0,0.2)]',
          'flex flex-col justify-between overflow-y-auto',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none',
          className
        )}
      >
        {/* Toggle Close Tab sticking out to the left (matching the SideActionButton position) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu panel"
          className={cn(
            'absolute -left-[54px] sm:-left-[62px] top-0',
            'w-[54px] sm:w-[62px] h-[54px] sm:h-[62px]',
            'bg-[#34418E] rounded-l-[18px] sm:rounded-l-[20px] rounded-r-none',
            'border-y border-l border-[#2A3575]',
            'shadow-[-2px_4px_18px_rgba(52,65,142,0.25)]',
            'flex items-center justify-center p-2.5 cursor-pointer',
            'hover:brightness-95 active:scale-95 transition-all select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#34418E]'
          )}
        >
          <Image
            src="/icons/arrow_right.svg"
            alt="Close menu"
            width={24}
            height={24}
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain pointer-events-none"
            priority
          />
        </button>

        {/* Panel Main Content Area */}
        <div className="flex-1 px-6 pt-3 pb-4 flex flex-col">
          {/* Header Row: "Menu" Title aligned with the toggle tab */}
          <div className="h-[44px] flex items-center mb-6">
            <h2 className="text-[22px] sm:text-[24px] font-bold text-white tracking-wide select-none">
              Menu
            </h2>
          </div>

          {/* Quick Actions List */}
          <div className="space-y-4 mb-7">
            {/* Organize Pages */}
            <button
              type="button"
              onClick={onOrganizePages}
              className="w-full flex items-center gap-3.5 text-white hover:text-white/80 active:scale-[0.98] transition-all cursor-pointer select-none py-1 group"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-white/90 group-hover:text-white"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="7" height="16" rx="1.5" />
                <rect x="14" y="4" width="7" height="16" rx="1.5" />
                <line x1="6" y1="8" x2="8" y2="8" />
                <line x1="6" y1="12" x2="8" y2="12" />
                <line x1="17" y1="8" x2="19" y2="8" />
                <line x1="17" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-[16px] sm:text-[17px] font-medium tracking-wide">
                Organize Pages
              </span>
            </button>
          </div>

          {/* Settings / Options Dropdowns */}
          <div className="space-y-4">
            {/* Paper Size */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="menu-paper-size"
                className="text-[14px] sm:text-[15px] font-medium text-white/95 select-none"
              >
                Paper Size
              </label>
              <div className="relative w-full bg-white rounded-[16px] px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-sm cursor-pointer">
                <span className="text-[15px] sm:text-[16px] font-medium text-[#2A2F3D] select-none">
                  {currentPaperSize}
                </span>
                <ChevronDown className="w-5 h-5 text-[#2A2F3D] shrink-0 pointer-events-none" />
                <select
                  id="menu-paper-size"
                  aria-label="Paper Size"
                  value={currentPaperSize}
                  onChange={(e) => handlePaperSizeChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  {PAPER_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Orientation */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="menu-orientation"
                className="text-[14px] sm:text-[15px] font-medium text-white/95 select-none"
              >
                Orientation
              </label>
              <div className="relative w-full bg-white rounded-[16px] px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-sm cursor-pointer">
                <span className="text-[15px] sm:text-[16px] font-medium text-[#2A2F3D] select-none">
                  {currentOrientation}
                </span>
                <ChevronDown className="w-5 h-5 text-[#2A2F3D] shrink-0 pointer-events-none" />
                <select
                  id="menu-orientation"
                  aria-label="Orientation"
                  value={currentOrientation}
                  onChange={(e) => handleOrientationChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  {ORIENTATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color Scheme */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="menu-color-scheme"
                className="text-[14px] sm:text-[15px] font-medium text-white/95 select-none"
              >
                Color Scheme
              </label>
              <div className="relative w-full bg-white rounded-[16px] px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-sm cursor-pointer">
                <span className="text-[15px] sm:text-[16px] font-medium text-[#2A2F3D] select-none">
                  {currentColorScheme}
                </span>
                <ChevronDown className="w-5 h-5 text-[#2A2F3D] shrink-0 pointer-events-none" />
                <select
                  id="menu-color-scheme"
                  aria-label="Color Scheme"
                  value={currentColorScheme}
                  onChange={(e) => handleColorSchemeChange(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  {COLOR_SCHEME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Large Yellow Print Button */}
          <div className="mt-7">
            <button
              type="button"
              onClick={onPrint}
              className={cn(
                'w-full bg-[#FDD41F] hover:bg-[#FCD20A] active:scale-[0.98]',
                'text-[#2A2F3D] font-bold text-[17px] sm:text-[18px] py-3.5 sm:py-4 rounded-[16px]',
                'shadow-[0_4px_16px_rgba(253,212,31,0.35)] transition-all cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#34418E]'
              )}
            >
              Print
            </button>
          </div>
        </div>

        {/* Panel Footer */}
        <footer className="w-full text-center pb-5 pt-3">
          <p className="text-[12px] font-medium text-white/40 tracking-wider select-none">
            Peso Print - 2026
          </p>
        </footer>
      </aside>
    </>
  );
};
