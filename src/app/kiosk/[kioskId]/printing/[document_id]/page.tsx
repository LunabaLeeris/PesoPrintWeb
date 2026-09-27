import React from 'react';
import { PrintingView } from '@/components/features/viewer';

interface PrintingPageProps {
  params: Promise<{
    kioskId: string;
    document_id: string;
  }>;
  searchParams: Promise<{
    cost?: string;
    pages?: string;
    copies?: string;
    scheme?: string;
    paper?: string;
  }>;
}

export default async function PrintingPage({ params, searchParams }: PrintingPageProps) {
  const { kioskId, document_id } = await params;
  const { cost, pages, copies, scheme, paper } = await searchParams;

  return (
    <PrintingView
      kioskId={kioskId}
      documentId={document_id}
      cost={cost ? parseFloat(cost) : undefined}
      totalPages={pages ? parseInt(pages, 10) : undefined}
      totalCopies={copies ? parseInt(copies, 10) : undefined}
      colorScheme={scheme || 'B&W'}
      paperSize={paper || 'A4'}
    />
  );
}
