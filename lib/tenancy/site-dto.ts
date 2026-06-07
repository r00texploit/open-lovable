import type { Site } from '@prisma/client';
import { buildTenantUrl } from '@/lib/tenancy/hostname';

export function toSiteDto(site: Site) {
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    subdomain: site.subdomain,
    customDomain: site.customDomain,
    customDomainVerified: site.customDomainVerified,
    domainStatus: site.domainStatus,
    published: site.published,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    lastPublishedAt: site.lastPublishedAt,
    liveUrl: buildTenantUrl(site.slug),
  };
}
