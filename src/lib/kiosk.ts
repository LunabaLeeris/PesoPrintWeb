/**
 * Kiosk Session and Cookie Management
 * 
 * Best Practice Decision:
 * We use a Route + Cookie hybrid approach:
 * 1. The QR code on the kiosk links to `/?kiosk=<uuid>` or `/kiosk/<uuid>` to pass the kiosk ID.
 * 2. The client immediately stores the `kiosk_id` in a cookie (`pesoprint_kiosk_id`) and localStorage.
 */

export const KIOSK_ID_COOKIE = 'pesoprint_kiosk_id';
export const KIOSK_SESSION_COOKIE = 'pesoprint_session_id';

/**
 * Gets a cookie value by name on the client
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Sets a cookie value on the client
 */
export function setCookie(name: string, value: string, days = 1) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Removes a cookie
 */
export function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Gets the current Kiosk ID from URL path, query params, cookie, or localStorage
 */
export function resolveKioskId(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check URL pathname (e.g. /kiosk/<uuid> or /<uuid>)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  for (const part of pathParts) {
    if (UUID_REGEX.test(part)) {
      setCookie(KIOSK_ID_COOKIE, part);
      try {
        localStorage.setItem(KIOSK_ID_COOKIE, part);
      } catch {
        // ignore
      }
      return part;
    }
  }

  // 2. Check URL query params (e.g. ?kiosk=uuid)
  const params = new URLSearchParams(window.location.search);
  const urlKioskId = params.get('kiosk');
  if (urlKioskId && UUID_REGEX.test(urlKioskId)) {
    setCookie(KIOSK_ID_COOKIE, urlKioskId);
    try {
      localStorage.setItem(KIOSK_ID_COOKIE, urlKioskId);
    } catch {
      // ignore
    }
    return urlKioskId;
  }

  // 3. Check Cookie
  const cookieKioskId = getCookie(KIOSK_ID_COOKIE);
  if (cookieKioskId && UUID_REGEX.test(cookieKioskId)) return cookieKioskId;

  // 4. Fallback to localStorage
  try {
    const local = localStorage.getItem(KIOSK_ID_COOKIE);
    if (local && UUID_REGEX.test(local)) return local;
  } catch {
    return null;
  }

  return null;
}

/**
 * Generates or retrieves a unique user session ID to prevent multiple users
 * from interacting with the same kiosk simultaneously.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = getCookie(KIOSK_SESSION_COOKIE);
  if (!sessionId) {
    try {
      sessionId = localStorage.getItem(KIOSK_SESSION_COOKIE);
    } catch {
      // ignore
    }
  }

  if (!sessionId) {
    // Generate a unique session token for this client
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    setCookie(KIOSK_SESSION_COOKIE, sessionId);
    try {
      localStorage.setItem(KIOSK_SESSION_COOKIE, sessionId);
    } catch {
      // ignore
    }
  }

  return sessionId;
}
