import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentViewer } from '@/components/features/viewer';
import { DocumentRow } from '@/types';

interface DocumentViewerPageProps {
  params: Promise<{
    kioskId: string;
    document_id: string;
  }>;
}

export default async function DocumentViewerPage({ params }: DocumentViewerPageProps) {
  const { kioskId, document_id } = await params;

  // Use document_id and kiosk_id to query Supabase database
  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', document_id)
    .eq('kiosk_id', kioskId)
    .maybeSingle();

  if (error || !document) {
    console.error('Document not found in Supabase:', error);
    notFound();
  }

  return (
    <DocumentViewer
      kioskId={kioskId}
      documentId={document_id}
      initialDocument={document as DocumentRow}
    />
  );
}
