import React from 'react';
import { PrintConfirmationView } from '@/components/features/viewer';

interface ConfirmationPageProps {
  params: Promise<{
    kioskId: string;
    document_id: string;
  }>;
  searchParams: Promise<{
    pages?: string;
    copies?: string;
  }>;
}

export default async function ConfirmationPage({ params, searchParams }: ConfirmationPageProps) {
  const { kioskId, document_id } = await params;
  const { pages, copies } = await searchParams;

  return (
    <PrintConfirmationView
      kioskId={kioskId}
      documentId={document_id}
      totalPages={pages ? parseInt(pages, 10) : undefined}
      totalCopies={copies ? parseInt(copies, 10) : undefined}
    />
  );
}
