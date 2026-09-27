'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentViewer } from '@/components/features/viewer';
import { PaymentPanel, CommunicatingLoadingView, CommunicatingMode } from '@/components/features/viewer/components';
import { DocumentRow } from '@/types';

export interface PaymentCostViewProps {
  kioskId: string;
  documentId: string;
  initialDocument?: DocumentRow | null;
  documentName?: string;
  cost?: number;
  totalPages?: number;
  totalCopies?: number;
  colorScheme?: string;
  paperSize?: string;
  onSelectOnline?: () => void;
  onSelectCoinslot?: () => void;
}

export const PaymentCostView: React.FC<PaymentCostViewProps> = ({
  kioskId,
  documentId,
  initialDocument,
  cost,
  totalPages,
  totalCopies,
  colorScheme = 'B&W',
  paperSize = 'A4',
  onSelectOnline,
  onSelectCoinslot,
}) => {
  const router = useRouter();
  const [communicatingMode, setCommunicatingMode] = useState<CommunicatingMode | null>(null);

  const handleBackToViewer = () => {
    router.push(`/kiosk/${kioskId}/document_viewer/${documentId}`);
  };

  const getQueryString = () => {
    const searchParams = new URLSearchParams();
    if (cost !== undefined) searchParams.set('cost', cost.toString());
    if (totalPages !== undefined) searchParams.set('pages', totalPages.toString());
    if (totalCopies !== undefined) searchParams.set('copies', totalCopies.toString());
    if (colorScheme) searchParams.set('scheme', colorScheme);
    if (paperSize) searchParams.set('paper', paperSize);

    return searchParams.toString() ? `?${searchParams.toString()}` : '';
  };

  const handleSelectOnline = () => {
    if (onSelectOnline) {
      onSelectOnline();
    } else {
      setCommunicatingMode('online');
    }
  };

  const handleSelectCoinslot = () => {
    if (onSelectCoinslot) {
      onSelectCoinslot();
    } else {
      setCommunicatingMode('coinslot');
    }
  };

  const handleCommunicatingComplete = () => {
    const queryString = getQueryString();
    if (communicatingMode === 'online') {
      router.push(`/kiosk/${kioskId}/document_viewer/${documentId}/payment/online${queryString}`);
    } else if (communicatingMode === 'coinslot') {
      router.push(`/kiosk/${kioskId}/document_viewer/${documentId}/payment/coinslot${queryString}`);
    }
  };

  return (
    <div className="relative w-full h-screen h-[100dvh] max-h-screen overflow-hidden">
      {/* Background: Composed DocumentViewer with page thumbnails, duplicate copies, list toggle & zoom */}
      <DocumentViewer
        kioskId={kioskId}
        documentId={documentId}
        initialDocument={initialDocument}
        initialViewMode="single"
        hideMenu
        hideMaximize
        hideCopyStepper
        onCancelClick={handleBackToViewer}
      />

      {/* Foreground: Completely replace PaymentPanel slide bar with CommunicatingLoadingView when communicating */}
      {communicatingMode ? (
        <CommunicatingLoadingView
          mode={communicatingMode}
          onCancel={() => setCommunicatingMode(null)}
          onComplete={handleCommunicatingComplete}
        />
      ) : (
        <PaymentPanel
          kioskId={kioskId}
          documentId={documentId}
          cost={cost}
          totalPages={totalPages}
          totalCopies={totalCopies}
          colorScheme={colorScheme}
          paperSize={paperSize}
          onSelectOnline={handleSelectOnline}
          onSelectCoinslot={handleSelectCoinslot}
        />
      )}
    </div>
  );
};
