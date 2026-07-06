import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireUser } from '@/lib/auth/server';
import {
  getUploadedImageExtension,
  getUploadedImagePublicPath,
  type UploadedImageLike,
} from '@/lib/ai/uploaded-image-paths';

export const dynamic = 'force-dynamic';

// Accepts a single uploaded image and moves its bytes into Blob storage,
// returning a lightweight reference. This keeps base64 out of the much larger
// generate/apply request bodies, which otherwise blow past the 4.5 MB
// serverless body limit and 413 when several images are attached.
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let image: UploadedImageLike | undefined;
  try {
    const body = await request.json();
    image = body?.image;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!image?.base64) {
    return NextResponse.json({ error: 'image.base64 is required' }, { status: 400 });
  }

  // Deterministic path shared by generate (advertises it to the model) and
  // apply (writes the file), derived from the base64 while we still have it.
  const path = getUploadedImagePublicPath(image);

  const meta = {
    name: image.name,
    type: image.type,
    size: image.size,
    label: image.label,
    role: image.role,
    notes: image.notes,
    path,
  };

  // Blob not configured (typical local dev): pass the bytes straight back.
  // There is no platform body limit locally, so base64 transport is fine.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ image: { ...meta, base64: image.base64 } });
  }

  try {
    const buffer = Buffer.from(image.base64, 'base64');
    const ext = getUploadedImageExtension(image.type);
    const blob = await put(`uploads/${auth.user.id}${path}`, buffer, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: image.type || `image/${ext}`,
      cacheControlMaxAge: 31536000,
    });

    return NextResponse.json({ image: { ...meta, blobUrl: blob.url } });
  } catch (error) {
    console.error('[upload-images] Blob upload failed, falling back to inline base64:', error);
    // Degrade gracefully rather than blocking generation.
    return NextResponse.json({ image: { ...meta, base64: image.base64 } });
  }
}
