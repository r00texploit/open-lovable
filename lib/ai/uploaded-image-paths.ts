import { createHash } from 'crypto';

export type UploadedImageLike = {
  base64?: string;
  type?: string;
  name?: string;
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
