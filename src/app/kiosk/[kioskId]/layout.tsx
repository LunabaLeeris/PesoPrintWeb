import React from 'react';
import { verifyKioskAccess } from '@/lib/kiosk-guard';
import { KioskBusyView } from '@/components/features/kiosk';

interface KioskLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    kioskId: string;
  }>;
}

/**
 * Clean Architecture: Kiosk Route Layout
 * 
 * Runs on the server for every single page under /kiosk/[kioskId]/*
 * (e.g. /kiosk/[kioskId], /kiosk/[kioskId]/viewer, etc.)
 * 
 * Checks if the kiosk exists in the Supabase database. If not, throws notFound().
 * Checks if the kiosk has an active session from another user. If so, renders KioskBusyView.
 * Individual child pages do not need to repeat any kiosk checking logic!
 */
export default async function KioskLayout({ children, params }: KioskLayoutProps) {
  const { kioskId } = await params;
  const { isBusy } = await verifyKioskAccess(kioskId);

  if (isBusy) {
    return <KioskBusyView />;
  }

  return <>{children}</>;
}
