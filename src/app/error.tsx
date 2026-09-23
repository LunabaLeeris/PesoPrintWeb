'use client';

import { useEffect } from 'react';
import { KioskMissingView } from '@/components/features/kiosk';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error caught by error boundary:', error);
  }, [error]);

  return <KioskMissingView />;
}
