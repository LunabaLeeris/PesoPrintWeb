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

  // Convert File to ArrayBuffer immediately to guarantee in-memory retention on mobile devices
  const arrayBuffer = await file.arrayBuffer();

  // Validate PDF magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
  const header = new Uint8Array(arrayBuffer.slice(0, 5));
  const isPdfMagic =
    header.length >= 4 &&
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46;   // F

  const hasPdfExt = file.name.toLowerCase().endsWith('.pdf');
  const isPdfMime = file.type.includes('pdf');

  // If not a PDF by magic bytes or name/type, reject early
  if (!isPdfMagic && !hasPdfExt && file.type && !isPdfMime) {
    throw new Error('The selected file is not a valid PDF. Please choose a PDF file.');
  }

  // Create clean, unique file path ensuring .pdf extension
  const rawName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const sanitizedName = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
  const timestamp = Date.now();
  const filePath = `uploads/${timestamp}_${sanitizedName}`;

  // Upload ArrayBuffer to Supabase Storage with strict application/pdf content type
  const { error: uploadError } = await supabase.storage
    .from(targetBucket)
    .upload(filePath, arrayBuffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });

  if (uploadError) {
    throw new Error(`Supabase Storage upload error: ${uploadError.message}`);
  }

  // Get Public URL
  const { data: publicUrlData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(filePath);

  let fileUrl = publicUrlData.publicUrl;
  console.log(`[StorageService] Upload successful! Public URL: ${fileUrl}`);

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

/**
 * Deletes a file from Supabase Storage bucket
 */
export async function deletePrintDocument(
  filePathOrUrl: string,
  bucketName?: string
): Promise<boolean> {
  const targetBucket = bucketName || getRequiredEnv('NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET');
  const supabase = createClient();

  // Extract relative storage path if full URL was passed
  let filePath = filePathOrUrl;
  const bucketPrefix = `/${targetBucket}/`;
  if (filePath.includes(bucketPrefix)) {
    filePath = filePath.substring(filePath.indexOf(bucketPrefix) + bucketPrefix.length);
  } else if (filePath.startsWith('http')) {
    const parts = filePath.split('/');
    filePath = `uploads/${parts[parts.length - 1]}`;
  }

  const { error } = await supabase.storage.from(targetBucket).remove([filePath]);
  if (error) {
    console.warn(`Supabase Storage removal warning: ${error.message}`);
    return false;
  }
  return true;
}

