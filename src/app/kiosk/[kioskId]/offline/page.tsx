import React from 'react';
import { KioskOfflineView } from '@/components/features/kiosk';

interface KioskOfflinePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function KioskOfflinePage({ searchParams }: KioskOfflinePageProps) {
  const resolvedParams = await searchParams;
  const reason = typeof resolvedParams?.message === 'string' ? resolvedParams.message : undefined;

  return <KioskOfflineView message={reason} />;
}
