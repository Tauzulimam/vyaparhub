import { NextResponse } from 'next/server';
import {
  MAX_PRODUCT_IMAGE_BYTES,
  validateAndUploadProductImageBuffer,
} from '@/lib/admin/catalog/imageUpload';
import { resolveAuthenticatedAdminForAction } from '@/lib/admin/catalog/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthenticatedAdminForAction();
    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          code: 'UNAUTHORIZED',
          error: auth.error,
        },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json(
        {
          success: false,
          code: 'MISSING_FILE',
          error: 'Expected multipart/form-data image upload.',
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          code: 'MISSING_FILE',
          error: 'Please select an image file to upload.',
        },
        { status: 400 }
      );
    }

    if (fileEntry.size > MAX_PRODUCT_IMAGE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          code: 'FILE_TOO_LARGE',
          error:
            'Image exceeds the 5 MB maximum size limit. Please choose a PNG, JPG, or WEBP file under 5 MB.',
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await fileEntry.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const supabase = await createClient();
    const result = await validateAndUploadProductImageBuffer({
      supabase,
      bytes,
      declaredMimeType: fileEntry.type,
    });

    if (!result.success) {
      const status =
        result.code === 'FILE_TOO_LARGE'
          ? 413
          : result.code === 'INVALID_FILE_TYPE' || result.code === 'MISSING_FILE'
          ? 400
          : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('Admin master product image upload route error:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'UPLOAD_FAILED',
        error: 'Could not upload product image right now. Please try again.',
      },
      { status: 500 }
    );
  }
}
