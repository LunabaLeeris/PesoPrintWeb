import React from 'react';
import { verifyKioskAccess } from '@/lib/kiosk-guard';
import { KioskBusyView, KioskOfflineView } from '@/components/features/kiosk';

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
 * Checks if the kiosk's Raspberry Pi print server is healthy via its tunnel. If not, renders KioskOfflineView.
 */
export default async function KioskLayout({ children, params }: KioskLayoutProps) {
  const { kioskId } = await params;
  const { isBusy, isHealthy, healthError } = await verifyKioskAccess(kioskId);

  if (isBusy) {
    return <KioskBusyView />;
  }

  if (!isHealthy) {
    return <KioskOfflineView message={healthError} />;
  }

  return <>{children}</>;
}
