import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const PRODUCT_IMAGES_BUCKET = 'product-images';
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type CanonicalProductImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

const EXTENSION_BY_MIME: Record<CanonicalProductImageMime, 'png' | 'jpg' | 'webp'> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export type ProductImageUploadErrorCode =
  | 'UNAUTHORIZED'
  | 'MISSING_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'UPLOAD_FAILED';

export type ProductImageUploadResult =
  | {
      success: true;
      imageUrl: string;
      objectPath: string;
      mimeType: CanonicalProductImageMime;
      sizeBytes: number;
    }
  | {
      success: false;
      code: ProductImageUploadErrorCode;
      error: string;
    };

function normalizeDeclaredMime(rawMime: string | undefined | null): CanonicalProductImageMime | null {
  const clean = (rawMime || '').trim().toLowerCase();
  if (clean === 'image/png') return 'image/png';
  if (clean === 'image/jpeg' || clean === 'image/jpg') return 'image/jpeg';
  if (clean === 'image/webp') return 'image/webp';
  return null;
}

/**
 * Inspects binary magic-byte signatures so disguised files (e.g. `.svg`, `.html`,
 * `.exe` renamed to `.png`) are strictly rejected regardless of filename or client MIME header.
 */
export function detectVerifiedImageMime(bytes: Uint8Array): CanonicalProductImageMime | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // WEBP: "RIFF" (0..3) + 4-byte size + "WEBP" (8..11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Generates a collision-safe server-side storage object path that completely ignores
 * any client-provided filename.
 */
export function generateSafeProductImageObjectPath(
  mimeType: CanonicalProductImageMime,
  now: Date = new Date()
): string {
  const year = now.getUTCFullYear();
  const ext = EXTENSION_BY_MIME[mimeType];
  return `master-products/${year}/${crypto.randomUUID()}.${ext}`;
}

/**
 * Validates and uploads a binary product image buffer to the `product-images`
 * Supabase Storage bucket using an authenticated ADMIN Supabase client.
 */
export async function validateAndUploadProductImageBuffer(params: {
  supabase: SupabaseClient;
  bytes: Uint8Array;
  declaredMimeType?: string | null;
}): Promise<ProductImageUploadResult> {
  const { supabase, bytes, declaredMimeType } = params;

  if (!bytes || bytes.byteLength === 0) {
    return {
      success: false,
      code: 'MISSING_FILE',
      error: 'Please select a non-empty image file to upload.',
    };
  }

  if (bytes.byteLength > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      success: false,
      code: 'FILE_TOO_LARGE',
      error: 'Image exceeds the 5 MB maximum size limit. Please upload a PNG, JPG, or WEBP under 5 MB.',
    };
  }

  const normalizedDeclared = normalizeDeclaredMime(declaredMimeType);
  const magicMime = detectVerifiedImageMime(bytes);

  if (!magicMime || (normalizedDeclared !== null && normalizedDeclared !== magicMime)) {
    return {
      success: false,
      code: 'INVALID_FILE_TYPE',
      error: 'Invalid image format. Only valid PNG, JPG/JPEG, and WEBP image files are allowed.',
    };
  }

  const objectPath = generateSafeProductImageObjectPath(magicMime);

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, bytes, {
      contentType: magicMime,
      upsert: false,
      cacheControl: '3600',
    });

  if (uploadError) {
    return {
      success: false,
      code: 'UPLOAD_FAILED',
      error: `Image upload failed: ${uploadError.message}`,
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(objectPath);

  if (!publicUrlData?.publicUrl) {
    return {
      success: false,
      code: 'UPLOAD_FAILED',
      error: 'Could not resolve public URL for uploaded product image.',
    };
  }

  return {
    success: true,
    imageUrl: publicUrlData.publicUrl,
    objectPath,
    mimeType: magicMime,
    sizeBytes: bytes.byteLength,
  };
}

const LOCAL_CATALOG_IMAGE_REGEX = /^\/images\/[a-zA-Z0-9/_-]+\.(svg|png|jpg|jpeg|webp)$/;
const SUPABASE_OBJECT_PATH_REGEX =
  /^\/storage\/v1\/object\/public\/product-images\/master-products\/\d{4}\/[0-9a-f-]{36}\.(png|jpg|webp)$/;

/**
 * Strictly validates `MasterProduct.imageUrl`:
 * - Allows safe local `/images/...` catalog paths (e.g. `/images/products/pharmacy-care.svg`,
 *   `/images/placeholder-product.svg`) with no traversal or query strings.
 * - Allows ONLY public URLs from THIS project's configured `NEXT_PUBLIC_SUPABASE_URL`
 *   under `/storage/v1/object/public/product-images/master-products/<year>/<uuid>.(png|jpg|webp)`.
 * - Rejects all arbitrary external domains, other buckets, `http://`, `data:`, or traversal paths.
 */
export function isValidMasterProductImageUrl(
  rawUrl: string,
  configuredSupabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): boolean {
  const trimmed = rawUrl?.trim() || '';
  if (!trimmed || trimmed.length > 500 || trimmed.includes('..') || trimmed.includes('\\')) {
    return false;
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) {
      return false;
    }
    return LOCAL_CATALOG_IMAGE_REGEX.test(trimmed);
  }

  if (!configuredSupabaseUrl) {
    return false;
  }

  try {
    const target = new URL(trimmed);
    const projectBase = new URL(configuredSupabaseUrl);

    if (target.protocol !== 'https:' || target.origin !== projectBase.origin) {
      return false;
    }

    if (target.search || target.hash) {
      return false;
    }

    return SUPABASE_OBJECT_PATH_REGEX.test(target.pathname);
  } catch {
    return false;
  }
}
