import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { KIOSK_ID_COOKIE, UUID_REGEX } from '@/lib/kiosk';

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const queryKioskId =
    typeof resolvedSearchParams?.kiosk === 'string'
      ? resolvedSearchParams.kiosk
      : undefined;

  const cookieStore = await cookies();
  const cookieKioskId = cookieStore.get(KIOSK_ID_COOKIE)?.value;

  const kioskId = queryKioskId || cookieKioskId;

  // If no valid kiosk ID is specified, trigger Next.js not-found error page
  if (!kioskId || !UUID_REGEX.test(kioskId)) {
    notFound();
  }

  // Redirect to the kiosk route
  redirect(`/kiosk/${kioskId}`);
}
