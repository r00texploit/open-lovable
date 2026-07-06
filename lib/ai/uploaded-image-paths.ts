import { createHash } from 'crypto';

export type UploadedImageLike = {
  id?: string;
  base64?: string;
  type?: string;
  name?: string;
  label?: string;
  role?: string;
  notes?: string;
  size?: number;
  // Set once the image has been uploaded to Blob storage so the raw base64
  // no longer needs to travel in generate/apply request bodies.
  path?: string;
  blobUrl?: string;
};

const ALLOWED_EXT: Record<string, string> = {
  png: 'png',
  jpeg: 'jpg',
  jpg: 'jpg',
  gif: 'gif',
  webp: 'webp',
  avif: 'avif',
};

export function getUploadedImageExtension(type?: string): string {
  const mimeSubtype = (type || '').split('/')[1]?.toLowerCase() ?? '';
  return ALLOWED_EXT[mimeSubtype] ?? 'png';
}

export function getUploadedImagePublicPath(image: UploadedImageLike): string {
  // Prefer the path assigned at upload time so generate (which advertises the
  // path to the model) and apply (which writes the file) always agree.
  if (image.path) {
    return image.path;
  }

  const ext = getUploadedImageExtension(image.type);
  const hash = createHash('sha256')
    .update(image.base64 || image.name || `${Date.now()}`)
    .digest('hex')
    .slice(0, 12);

  return `/images/upload-${hash}.${ext}`;
}

export function getUploadedImageSandboxPath(image: UploadedImageLike): string {
  return `public${getUploadedImagePublicPath(image)}`;
}

/**
 * Resolve the raw bytes for an uploaded image, whether it arrived inline as
 * base64 (local dev / Blob not configured) or as a Blob URL reference.
 */
export async function resolveUploadedImageBytes(image: UploadedImageLike): Promise<Buffer | null> {
  if (image.base64) {
    return Buffer.from(image.base64, 'base64');
  }
  if (image.blobUrl) {
    const response = await fetch(image.blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch uploaded image from blob storage (${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return null;
}
