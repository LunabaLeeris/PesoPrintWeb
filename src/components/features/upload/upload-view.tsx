'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/common/nav-bar';
import { ModalPanel } from '@/components/common/modal-panel';
import { Button } from '@/components/common/button';
import { setCookie, KIOSK_ID_COOKIE, resolveKioskId } from '@/lib/kiosk';
import { uploadPrintDocument } from '@/services/storage-service';
import { saveDocumentRecord } from '@/services/kiosk-service';

export type UploadViewState = 'idle' | 'uploading' | 'error';

export interface UploadViewProps {
  kioskId?: string;
  initialKioskId?: string;
  initialViewState?: UploadViewState;
  onFileSelect?: (file: File) => void;
  onHelpClick?: () => void;
  uploadDurationMs?: number;
}

export const UploadView: React.FC<UploadViewProps> = ({
  kioskId,
  initialKioskId,
  initialViewState,
  onFileSelect,
  onHelpClick,
}) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewState, setViewState] = useState<UploadViewState>(initialViewState || 'idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Please wait while we upload your file.');

  const activeKioskId = kioskId || initialKioskId || resolveKioskId();

  // Keep client-side cookie and localStorage synchronized with current kioskId
  useEffect(() => {
    if (activeKioskId) {
      setCookie(KIOSK_ID_COOKIE, activeKioskId);
      try {
        localStorage.setItem(KIOSK_ID_COOKIE, activeKioskId);
      } catch {
        // ignore
      }
    }
  }, [activeKioskId]);

  const processSelectedFile = async (file: File) => {
    onFileSelect?.(file);
    setErrorMessage(null);
    setViewState('uploading');
    setUploadProgress(15);
    setStatusMessage('Reading document...');

    try {
      if (!activeKioskId) {
        throw new Error('Kiosk session not found. Please scan the QR code again.');
      }

      // Progress animation simulation while uploading
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 75 ? prev + 10 : prev));
      }, 250);

      // 1. Upload to Supabase Storage (converts to ArrayBuffer and validates PDF magic bytes)
      setStatusMessage('Uploading to Peso Print cloud...');
      const uploadResult = await uploadPrintDocument(file);
      setUploadProgress(85);

      // 2. Save document record in Supabase documents table
      setStatusMessage('Saving document record...');
      const documentRecord = await saveDocumentRecord(
        activeKioskId,
        uploadResult.fileName || file.name,
        uploadResult.publicUrl,
        [[1, 1]]
      );

      clearInterval(progressTimer);
      setUploadProgress(100);
      setStatusMessage('Opening document viewer...');

      // 3. Navigate to the document viewer route under kiosk
      setTimeout(() => {
        router.push(`/kiosk/${activeKioskId}/document_viewer/${documentRecord.id}`);
      }, 400);
    } catch (err: unknown) {
      console.error('Failed to upload document:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to upload document. Please check your network and try again.';
      setErrorMessage(message);
      setViewState('error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processSelectedFile(files[0]);
  };

  const handleQuestionClick = () => {
    if (onHelpClick) {
      onHelpClick();
    } else {
      alert('Need help? Visit the Peso Print kiosk counter or scan the QR code.');
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setUploadProgress(0);
    setStatusMessage('Please wait while we upload your file.');
    setViewState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

      {/* Top Navigation Bar - spans full width edge-to-edge */}
      <NavBar onQuestionClick={handleQuestionClick} />

      {/* Center Section */}
      <section
        aria-label="Document Upload Section"
        className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-8 z-10"
      >
        <div className="relative w-full max-w-[340px]">
          {/* Permanent file input in DOM to guarantee it never unmounts across state transitions */}
          <input
            id="mobile-pdf-upload"
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,application/x-pdf,application/octet-stream,*/*"
            className={
              viewState === 'idle'
                ? 'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30'
                : 'sr-only pointer-events-none'
            }
            onChange={handleFileChange}
            aria-label="Upload PDF file"
          />

          {viewState === 'idle' && (
            // Idle Upload Card - pointer-events-none on panel ensures taps hit the native input overlay
            <ModalPanel
              illustration="upload_document.svg"
              illustrationAlt="Upload PDF Document"
              title="Press to upload a document"
              description="This kiosk only accept pdfs"
              isClickable={true}
              className="w-full pointer-events-none"
            />
          )}

          {viewState === 'uploading' && (
            // Uploading / Loading Card matching reference image
            <ModalPanel isClickable={false} className="w-full">
              <div className="relative mb-5 flex flex-col items-center w-full">
                <ModalPanel.Icon
                  src="uploading.svg"
                  alt="Uploading File"
                  className="mb-3"
                />
                {/* Progress bar matching the reference image under the document */}
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(uploadProgress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Uploading file progress"
                  className="w-[135px] h-[9px] bg-[#D6D6E3] rounded-full overflow-hidden shadow-inner -mt-1"
                >
                  <div
                    className="h-full bg-[#FDD41F] rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                  />
                </div>
              </div>

              <ModalPanel.Title>Uploading File</ModalPanel.Title>
              <ModalPanel.Description>
                {statusMessage}
              </ModalPanel.Description>
            </ModalPanel>
          )}

          {viewState === 'error' && (
            // Error State Card
            <ModalPanel isClickable={false} className="w-full">
              <ModalPanel.Icon
                src="error.svg"
                alt="Upload Failed"
                className="mb-3"
              />
              <ModalPanel.Title>Upload Failed</ModalPanel.Title>
              <ModalPanel.Description>
                {errorMessage || 'An error occurred while uploading. Please try again.'}
              </ModalPanel.Description>
              <div className="mt-4 w-full">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={handleRetry}
                >
                  Try Again
                </Button>
              </div>
            </ModalPanel>
          )}
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
