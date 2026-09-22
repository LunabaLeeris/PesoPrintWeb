import { createClient } from '@/lib/supabase/client';
import { StorageUploadResult } from '@/types';
import { getRequiredEnv } from '@/lib/env';

/**
 * Uploads a document to Supabase Storage bucket and retrieves an accessible download URL.
 * Automatically tries public URL first, and falls back to a 1-hour signed URL if needed.
 */
export async function uploadPrintDocument(
  file: File,
  bucketName?: string
): Promise<StorageUploadResult> {
  const targetBucket = bucketName || getRequiredEnv('NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET');
  const supabase = createClient();

  // Create clean, unique file path
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const filePath = `uploads/${timestamp}_${sanitizedName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(targetBucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/pdf',
    });

  if (uploadError) {
    throw new Error(`Supabase Storage upload error: ${uploadError.message}`);
  }

  // Get Public URL
  const { data: publicUrlData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(filePath);

  let fileUrl = publicUrlData.publicUrl;

  // If bucket might be private or public URL not accessible, also generate a 1-hour signed URL
  if (!fileUrl) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(targetBucket)
      .createSignedUrl(filePath, 3600);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(`Failed to obtain URL from Supabase: ${signedError?.message || 'Unknown error'}`);
    }

    fileUrl = signedData.signedUrl;
  }

  return {
    path: filePath,
    publicUrl: fileUrl,
    fileName: file.name,
    fileSize: file.size,
  };
}
