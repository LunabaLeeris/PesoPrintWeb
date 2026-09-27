import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PaymentCostView } from './payment-cost-view';

interface PaymentPageProps {
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

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const { kioskId, document_id } = await params;
  const { cost, pages, copies, scheme, paper } = await searchParams;

  // Verify document existence if possible
  const supabase = await createClient();
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', document_id)
    .maybeSingle();

  return (
    <PaymentCostView
      kioskId={kioskId}
      documentId={document_id}
      initialDocument={document}
      documentName={document?.name || 'Document'}
      cost={cost ? parseFloat(cost) : undefined}
      totalPages={pages ? parseInt(pages, 10) : undefined}
      totalCopies={copies ? parseInt(copies, 10) : undefined}
      colorScheme={scheme || 'B&W'}
      paperSize={paper || 'A4'}
    />
  );
}
