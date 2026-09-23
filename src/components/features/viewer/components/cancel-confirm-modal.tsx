'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/common/button';
import { cn } from '@/lib/utils';

export interface CancelConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      aria-describedby="cancel-modal-description"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 select-none"
    >
      {/* Dimmed backdrop */}
      <div
        data-testid="cancel-modal-backdrop"
        onClick={isDeleting ? undefined : onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Card matching reference image */}
      <div className="relative z-10 w-full max-w-[340px] sm:max-w-[360px] bg-white rounded-[26px] sm:rounded-[28px] px-6 sm:px-8 py-8 sm:py-9 flex flex-col items-center text-center shadow-[0_16px_48px_rgba(0,0,0,0.14)] border border-white/60 animate-in zoom-in-95 fade-in duration-150">
        {/* Person with question icon illustration */}
        <div className="relative w-28 h-36 mb-2 flex items-center justify-center pointer-events-none select-none">
          <Image
            src="/illustrations/confirmation.svg"
            alt="Cancel Confirmation"
            width={110}
            height={145}
            className="w-auto h-full max-h-36 object-contain"
            priority
          />
        </div>

        {/* Modal Title */}
        <h2
          id="cancel-modal-title"
          className="text-[19px] sm:text-[21px] font-bold text-[#2A2F3D] tracking-tight leading-snug mb-2"
        >
          Cancel printing?
        </h2>

        {/* Modal Description */}
        <p
          id="cancel-modal-description"
          className="text-[13.5px] sm:text-[14.5px] font-normal text-[#5A5E6B] leading-relaxed max-w-[270px] mx-auto mb-6"
        >
          Are you sure you want to cancel your printing session? All details will be deleted permanently!
        </p>

        {/* Action Buttons: [No] (Blue) and [Cancel] (Yellow) */}
        <div className="w-full grid grid-cols-2 gap-3 items-center justify-center">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={isDeleting}
            onClick={onClose}
            className="py-3.5 text-[16px] rounded-[16px]"
          >
            No
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            isLoading={isDeleting}
            disabled={isDeleting}
            onClick={onConfirm}
            className="py-3.5 text-[16px] rounded-[16px]"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
