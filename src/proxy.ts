import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { KIOSK_ID_COOKIE, UUID_REGEX } from '@/lib/kiosk';

// 7 days cookie lifetime (in seconds)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Direct root UUID access: http://localhost:3000/11111111-1111-1111-1111-111111111111
  const rootUuidMatch = pathname.match(
    /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i
  );
  if (rootUuidMatch) {
    const kioskId = rootUuidMatch[1];
    const redirectUrl = new URL(`/kiosk/${kioskId}`, request.url);
    redirectUrl.search = request.nextUrl.search;
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(KIOSK_ID_COOKIE, kioskId, {
      path: '/',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });
    return response;
  }

  // 2. Kiosk route access: http://localhost:3000/kiosk/11111111-1111-1111-1111-111111111111
  const kioskMatch = pathname.match(
    /^\/kiosk\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i
  );
  if (kioskMatch) {
    const kioskId = kioskMatch[1];
    // Sync request cookie so Server Components in this render cycle see the updated kioskId
    request.cookies.set(KIOSK_ID_COOKIE, kioskId);
    const response = await updateSession(request);
    // Replace/set cookie on the outgoing HTTP response
    response.cookies.set(KIOSK_ID_COOKIE, kioskId, {
      path: '/',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });
    return response;
  }

  // 3. Query param support: http://localhost:3000/?kiosk=11111111-1111-1111-1111-111111111111
  const queryKioskId = request.nextUrl.searchParams.get('kiosk');
  if (queryKioskId && UUID_REGEX.test(queryKioskId)) {
    if (pathname === '/') {
      const redirectUrl = new URL(`/kiosk/${queryKioskId}`, request.url);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set(KIOSK_ID_COOKIE, queryKioskId, {
        path: '/',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
      });
      return response;
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
