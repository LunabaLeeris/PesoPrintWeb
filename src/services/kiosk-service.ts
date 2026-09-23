import { createClient } from '@/lib/supabase/client';
import { KioskRow, DocumentRow, DocumentInsert, PagePrintOption } from '@/types';

export interface KioskSessionResult {
  success: boolean;
  kiosk?: KioskRow;
  error?: string;
  isLockedByOther?: boolean;
}

const SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes session lock timeout

/**
 * Claims or validates a session lock on the kiosk for the current user.
 * Ensures no two users can use the same kiosk simultaneously.
 */
export async function claimKioskSession(
  kioskId: string,
  userSessionId: string
): Promise<KioskSessionResult> {
  const supabase = createClient();

  // 1. Fetch kiosk status
  const { data: kiosk, error } = await supabase
    .from('kiosks')
    .select('*')
    .eq('id', kioskId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Kiosk does not exist yet -> auto-provision
    const { data: newKiosk, error: insertError } = await supabase
      .from('kiosks')
      .insert({
        id: kioskId,
        session: userSessionId,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, kiosk: newKiosk };
  }

  if (error || !kiosk) {
    return { success: false, error: error?.message || 'Failed to query kiosk' };
  }

  // 2. Check existing session lock
  const lastUpdated = new Date(kiosk.date_updated).getTime();
  const isStale = Date.now() - lastUpdated > SESSION_EXPIRY_MS;

  if (kiosk.session && kiosk.session !== userSessionId && !isStale) {
    return {
      success: false,
      kiosk,
      isLockedByOther: true,
      error: 'This kiosk is currently being used by another person. Please wait.',
    };
  }

  // 3. Update session to current user
  const { data: updatedKiosk, error: updateError } = await supabase
    .from('kiosks')
    .update({
      session: userSessionId,
      date_updated: new Date().toISOString(),
    })
    .eq('id', kioskId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, kiosk: updatedKiosk };
}

/**
 * Releases the kiosk session lock when the user finishes or navigates away
 */
export async function releaseKioskSession(
  kioskId: string,
  userSessionId: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('kiosks')
    .update({ session: null })
    .eq('id', kioskId)
    .eq('session', userSessionId);

  return !error;
}

/**
 * Retrieves a specific kiosk by its ID
 */
export async function getKioskById(kioskId: string): Promise<KioskRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('kiosks')
    .select('*')
    .eq('id', kioskId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching kiosk:', error);
    return null;
  }

  return data;
}

/**
 * Retrieves the printer server tunnel URL for a specific kiosk.
 * Each kiosk can have a distinct Cloudflare tunnel URL stored in the `tunnel` column.
 * Falls back to NEXT_PUBLIC_PRINT_SERVER_URL if no tunnel is configured.
 */
export async function getKioskPrinterUrl(kioskId: string): Promise<string> {
  const kiosk = await getKioskById(kioskId);
  return kiosk?.tunnel || process.env.NEXT_PUBLIC_PRINT_SERVER_URL || '';
}

/**
 * Saves document metadata into the `documents` table
 */
export async function saveDocumentRecord(
  kioskId: string,
  fileName: string,
  documentUrl: string,
  options: PagePrintOption[] = []
): Promise<DocumentRow> {
  const supabase = createClient();

  const record: DocumentInsert = {
    kiosk_id: kioskId,
    name: fileName,
    document_url: documentUrl,
    options,
  };

  const { data, error } = await supabase
    .from('documents')
    .insert(record)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save document record: ${error?.message}`);
  }

  return data;
}

/**
 * Updates page print options for an uploaded document
 * Format: [[1, 3], [2, 0], [i, j]]
 */
export async function updateDocumentPrintOptions(
  documentId: string,
  options: PagePrintOption[]
): Promise<DocumentRow> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('documents')
    .update({
      options,
      date_updated: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update document options: ${error?.message}`);
  }

  return data;
}

/**
 * Retrieves all documents uploaded for a specific kiosk
 */
export async function getDocumentsForKiosk(kioskId: string): Promise<DocumentRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('kiosk_id', kioskId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch documents for kiosk: ${error.message}`);
  }

  return data || [];
}

/**
 * Retrieves a specific document by its ID and kiosk ID
 */
export async function getDocumentByIdAndKiosk(
  documentId: string,
  kioskId: string
): Promise<DocumentRow | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('kiosk_id', kioskId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }

  return data;
}

/**
 * Deletes a document record from the documents table
 */
export async function deleteDocumentRecord(
  documentId: string,
  kioskId?: string
): Promise<boolean> {
  const supabase = createClient();

  let query = supabase.from('documents').delete().eq('id', documentId);
  if (kioskId) {
    query = query.eq('kiosk_id', kioskId);
  }

  const { error } = await query;
  if (error) {
    console.error('Failed to delete document record:', error);
    throw new Error(`Failed to delete document record: ${error.message}`);
  }

  return true;
}
