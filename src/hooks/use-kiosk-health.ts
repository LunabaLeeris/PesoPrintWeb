'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkKioskPrinterHealth, KioskHealthResult } from '@/services/printer-service';
import { resolveKioskId } from '@/lib/kiosk';

export interface UseKioskHealthReturn {
  isHealthy: boolean;
  isChecking: boolean;
  healthResult: KioskHealthResult | null;
  errorMessage: string | null;
  checkHealth: () => Promise<KioskHealthResult>;
}

/**
 * React hook that monitors Raspberry Pi print server health for a kiosk.
 * - Runs health check on mount.
 * - Automatically re-verifies when the browser window gains focus or document becomes visible.
 * - Provides an imperative checkHealth() method for pre-flight validation before actions (fetches, uploads, prints).
 */
export function useKioskHealth(kioskId?: string): UseKioskHealthReturn {
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [healthResult, setHealthResult] = useState<KioskHealthResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeKioskId = kioskId || resolveKioskId() || undefined;
  const isMountedRef = useRef<boolean>(true);

  const checkHealth = useCallback(async (): Promise<KioskHealthResult> => {
    if (!activeKioskId) {
      const fallbackResult: KioskHealthResult = {
        isHealthy: true,
        status: 200,
        message: 'No active kiosk ID to verify.',
        latencyMs: 0,
      };
      return fallbackResult;
    }

    setIsChecking(true);
    try {
      const result = await checkKioskPrinterHealth(activeKioskId);
      if (isMountedRef.current) {
        setHealthResult(result);
        setIsHealthy(result.isHealthy);
        setErrorMessage(result.isHealthy ? null : result.message);
        setIsChecking(false);
      }
      return result;
    } catch (err) {
      const failedResult: KioskHealthResult = {
        isHealthy: false,
        status: 0,
        message: err instanceof Error ? err.message : 'Health check failed unexpectedly.',
        latencyMs: 0,
      };
      if (isMountedRef.current) {
        setHealthResult(failedResult);
        setIsHealthy(false);
        setErrorMessage(failedResult.message);
        setIsChecking(false);
      }
      return failedResult;
    }
  }, [activeKioskId]);

  // Initial check on mount or when activeKioskId changes
  useEffect(() => {
    isMountedRef.current = true;
    checkHealth();

    return () => {
      isMountedRef.current = false;
    };
  }, [checkHealth]);

  // Re-check on tab visibility change or window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    };

    const handleFocus = () => {
      checkHealth();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkHealth]);

  return {
    isHealthy,
    isChecking,
    healthResult,
    errorMessage,
    checkHealth,
  };
}
