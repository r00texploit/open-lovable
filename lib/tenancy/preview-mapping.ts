/**
 * Maps site subdomains to sandbox URLs for live preview during development.
 * This allows users to preview their site at custom subdomains like user-webapp.example.com
 * instead of the raw Vercel Sandbox URL (xxx.vercel.run).
 */

interface PreviewMapping {
  sandboxUrl: string;
  sandboxId: string;
  siteId: string;
  userId: string;
  createdAt: number;
}

// In-memory storage for preview mappings (subdomain -> preview data)
const previewMappings = new Map<string, PreviewMapping>();

/**
 * Register a preview mapping for a site subdomain
 */
export function registerPreviewMapping(
  subdomain: string,
  sandboxUrl: string,
  sandboxId: string,
  siteId: string,
  userId: string
): void {
  previewMappings.set(subdomain, {
    sandboxUrl,
    sandboxId,
    siteId,
    userId,
    createdAt: Date.now(),
  });
}

/**
 * Get preview mapping for a subdomain
 */
export function getPreviewMapping(subdomain: string): PreviewMapping | null {
  return previewMappings.get(subdomain) || null;
}

/**
 * Remove preview mapping for a subdomain
 */
export function removePreviewMapping(subdomain: string): void {
  previewMappings.delete(subdomain);
}

/**
 * Get sandbox URL for a subdomain (for proxying)
 */
export function getSandboxUrlForSubdomain(subdomain: string): string | null {
  const mapping = previewMappings.get(subdomain);
  return mapping?.sandboxUrl || null;
}

/**
 * Check if a subdomain has an active preview mapping
 */
export function hasPreviewMapping(subdomain: string): boolean {
  return previewMappings.has(subdomain);
}

/**
 * Clean up old preview mappings (older than 24 hours)
 */
export function cleanupOldPreviewMappings(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [subdomain, mapping] of previewMappings.entries()) {
    if (now - mapping.createdAt > maxAgeMs) {
      previewMappings.delete(subdomain);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Build the custom preview URL for a site
 */
export function buildPreviewUrl(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.ROOT_DOMAIN || 'mydomain.com';
  return `https://${subdomain}.${rootDomain}`;
}
