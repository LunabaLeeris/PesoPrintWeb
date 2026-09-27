import React from 'react';
import { PaymentSuccessView } from '@/components/features/viewer';

interface PaymentSuccessPageProps {
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

export default async function PaymentSuccessPage({ params, searchParams }: PaymentSuccessPageProps) {
  const { kioskId, document_id } = await params;
  const { cost, pages, copies, scheme, paper } = await searchParams;

  return (
    <PaymentSuccessView
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
