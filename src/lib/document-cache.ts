/**
 * Cache utility for storing and retrieving the active document_id in client-side storage.
 * Synchronizes between sessionStorage and localStorage for seamless transitions.
 */

export const CACHED_DOCUMENT_ID_KEY = 'pesoprint_document_id';
export const CURRENT_DOC_ID_KEY = 'current_document_id';

/**
 * Saves the active document_id to client cache
 */
export function saveCachedDocumentId(documentId: string): void {
  if (typeof window === 'undefined' || !documentId) return;
  try {
    sessionStorage.setItem(CURRENT_DOC_ID_KEY, documentId);
    sessionStorage.setItem(CACHED_DOCUMENT_ID_KEY, documentId);
    localStorage.setItem(CACHED_DOCUMENT_ID_KEY, documentId);
  } catch (err) {
    console.error('Failed to save document_id to cache:', err);
  }
}

/**
 * Retrieves the active document_id from client cache (sessionStorage or localStorage)
 */
export function getCachedDocumentId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      sessionStorage.getItem(CURRENT_DOC_ID_KEY) ||
      sessionStorage.getItem(CACHED_DOCUMENT_ID_KEY) ||
      localStorage.getItem(CACHED_DOCUMENT_ID_KEY) ||
      null
    );
  } catch (err) {
    console.error('Failed to get cached document_id:', err);
    return null;
  }
}
