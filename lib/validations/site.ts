import { z } from 'zod';

export const RESERVED_SITE_SLUGS = new Set([
  'www',
  'app',
  'admin',
  'api',
  'dashboard',
  'login',
  'signup',
  'auth',
  'billing',
  'support',
  'docs',
  'status',
  'mail',
  'ftp',
  'smtp',
  'imap',
  'pop',
  'mx',
  'ns1',
  'ns2',
  'static',
  'assets',
  'cdn',
  'vercel',
  'localhost',
]);

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;
const domainRegex =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeSiteSlug(value: string) {
  return value.trim().toLowerCase();
}

export function isReservedSiteSlug(slug: string) {
  return RESERVED_SITE_SLUGS.has(slug);
}

export const slugSchema = z
  .string()
  .trim()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be at most 50 characters')
  .transform(normalizeSiteSlug)
  .refine((slug) => slugRegex.test(slug), {
    message:
      'Slug must be lowercase letters, numbers, or hyphens, and cannot start or end with a hyphen',
  })
  .refine((slug) => !isReservedSiteSlug(slug), {
    message: 'That slug is reserved',
  });

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

export const domainSchema = z
  .string()
  .trim()
  .min(1, 'Domain is required')
  .transform(normalizeDomain)
  .refine((domain) => domainRegex.test(domain), {
    message: 'Enter a valid domain name',
  });

export const createSiteSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  slug: slugSchema,
});

export const updateSiteSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: slugSchema.optional(),
  published: z.boolean().optional(),
});

export const customDomainSchema = z.object({
  domain: domainSchema,
});
