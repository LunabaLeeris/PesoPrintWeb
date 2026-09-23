import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { KioskRow } from '@/types';
import { KIOSK_ID_COOKIE, KIOSK_SESSION_COOKIE, UUID_REGEX } from '@/lib/kiosk';
import { checkKioskPrinterHealth } from '@/services/printer-service';

export interface KioskGuardResult {
  kiosk: KioskRow;
  isBusy: boolean;
  isHealthy: boolean;
  healthError?: string;
}

/**
 * Validates that a kiosk exists in the database.
 * If the kioskId is missing, invalid, or does not exist in the database,
 * it immediately triggers Next.js notFound() (rendering the Missing Url page).
 *
 * It checks whether an active session is held by another user.
 * It also checks whether the kiosk's Raspberry Pi print server is healthy via its tunnel.
 */
export async function verifyKioskAccess(kioskId?: string): Promise<KioskGuardResult> {
  const cookieStore = await cookies();
  const targetKioskId = kioskId || cookieStore.get(KIOSK_ID_COOKIE)?.value;

  // Validate format
  if (!targetKioskId || !UUID_REGEX.test(targetKioskId)) {
    notFound();
  }

  // Query Supabase to verify existence in database
  const supabase = await createClient();
  const { data: kiosk, error } = await supabase
    .from('kiosks')
    .select('*')
    .eq('id', targetKioskId)
    .maybeSingle();

  if (error || !kiosk) {
    notFound();
  }

  // Check active session lock
  const userSessionId = cookieStore.get(KIOSK_SESSION_COOKIE)?.value;
  const isStale = Date.now() - new Date(kiosk.date_updated).getTime() > 10 * 60 * 1000;
  const isBusy = Boolean(kiosk.session && kiosk.session !== userSessionId && !isStale);

  // Check Raspberry Pi printer health via the kiosk's tunnel or fallback server URL
  let isHealthy = true;
  let healthError: string | undefined;

  const printerTarget = kiosk.tunnel || process.env.NEXT_PUBLIC_PRINT_SERVER_URL;
  if (printerTarget) {
    const healthResult = await checkKioskPrinterHealth(printerTarget);
    isHealthy = healthResult.isHealthy;
    if (!healthResult.isHealthy) {
      healthError = healthResult.message;
    }
  }

  return { kiosk, isBusy, isHealthy, healthError };
}
