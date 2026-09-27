import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { OnlinePaymentView } from '@/components/features/viewer';

interface OnlinePaymentPageProps {
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

export default async function OnlinePaymentPage({ params, searchParams }: OnlinePaymentPageProps) {
  const { kioskId, document_id } = await params;
  const { cost, pages, copies, scheme, paper } = await searchParams;

  const supabase = await createClient();
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', document_id)
    .maybeSingle();

  return (
    <OnlinePaymentView
      kioskId={kioskId}
      documentId={document_id}
      initialDocument={document}
      cost={cost ? parseFloat(cost) : undefined}
      totalPages={pages ? parseInt(pages, 10) : undefined}
      totalCopies={copies ? parseInt(copies, 10) : undefined}
      colorScheme={scheme || 'B&W'}
      paperSize={paper || 'A4'}
    />
  );
}
