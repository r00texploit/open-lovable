import type { UploadedImageLike } from '@/lib/ai/uploaded-image-paths';

// Cache uploads by a stable image identity so an image attached once is not
// re-uploaded for every generate/apply round trip in the same session.
const uploadCache = new Map<string, UploadedImageLike>();

function cacheKey(image: UploadedImageLike): string {
  if (image.id) return `id:${image.id}`;
  // Fall back to a cheap fingerprint of the (large) base64 payload.
  const b64 = image.base64 || '';
  return `b64:${image.name || ''}:${b64.length}:${b64.slice(0, 32)}`;
}

/**
 * Move each attached image's bytes to Blob storage (one small request per
 * image) and return references with `path`/`blobUrl` instead of base64, so the
 * generate/apply request bodies stay well under the serverless size limit.
 *
 * Uploads happen one image per request to keep any single body small. On
 * failure the original (base64) payload is kept so generation still works.
 */
export async function ensureImagesUploaded<T extends UploadedImageLike & { id?: string }>(
  images: T[] | undefined
): Promise<T[] | undefined> {
  if (!images || images.length === 0) return images;

  return Promise.all(
    images.map(async (image) => {
      // Already a lightweight reference — nothing to upload.
      if (image.blobUrl || !image.base64) return image;

      const key = cacheKey(image);
      const cached = uploadCache.get(key);
      if (cached) return { ...image, ...cached, base64: cached.base64 } as T;

      try {
        const response = await fetch('/api/upload-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        });
        if (!response.ok) throw new Error(`upload failed (${response.status})`);
        const data = await response.json();
        const ref = data?.image as UploadedImageLike | undefined;
        if (!ref) return image;

        // Merge server-assigned path/blobUrl; drop base64 only when the server
        // returned a blob reference (prod). Otherwise keep base64 (local dev).
        const merged: T = {
          ...image,
          path: ref.path ?? image.path,
          blobUrl: ref.blobUrl,
          base64: ref.blobUrl ? undefined : image.base64,
        } as T;

        uploadCache.set(key, merged);
        return merged;
      } catch (error) {
        console.error('[ensureImagesUploaded] Falling back to inline image:', error);
        return image;
      }
    })
  );
}
