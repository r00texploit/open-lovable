import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';
import { buildSiteSnapshot, publishSiteSnapshot } from '@/lib/tenancy/site-publishing';
import { toSiteDto } from '@/lib/tenancy/site-dto';
import {
  deployStaticSiteToVps,
  isVpsDeploymentEnabled,
  undeployStaticSiteFromVps,
} from '@/lib/vps-deployments';
import { addDomainToVps, removeDomainFromVps, verifyVpsDomain } from '@/lib/vps-hosting';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const site = await prisma.site.findFirst({
    where: {
      id,
      userId: auth.user.id,
    },
  });

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const sandboxId = typeof body?.sandboxId === 'string' ? body.sandboxId : undefined;
  const resolved = await resolveRequestSandbox(sandboxId);

  if (!resolved.ok) {
    return resolved.response;
  }

  const files = await buildSiteSnapshot(resolved.value.provider);
  const previousAssets = site.published
    ? await prisma.siteAsset.findMany({ where: { siteId: site.id } })
    : [];

  let authorizedCustomDomain: { domain: string; token: string } | null = null;
  if (site.customDomain && site.domainVerificationToken) {
    const stillVerified = await verifyVpsDomain(site.customDomain, site.domainVerificationToken);
    if (stillVerified) {
      authorizedCustomDomain = { domain: site.customDomain, token: site.domainVerificationToken };
    } else if (site.customDomainVerified) {
      await removeDomainFromVps(site.customDomain).catch((error) => {
        console.error('[publish] Failed to remove stale custom-domain route:', error);
      });
      await prisma.site.update({
        where: { id: site.id },
        data: { customDomainVerified: false, domainStatus: 'pending_verification' },
      });
    }
  }

  const activateVpsRelease = async (
    releaseFiles: Array<{ path: string; contentType: string; content: Buffer; size: number }>,
  ) => {
    const deployment = await deployStaticSiteToVps(site.id, site.subdomain, releaseFiles);
    if (authorizedCustomDomain) {
      await addDomainToVps(authorizedCustomDomain.domain, site.id, authorizedCustomDomain.token);
    }
    return deployment;
  };

  let vpsDeployment: { deployed: boolean; url: string } | null = null;
  if (isVpsDeploymentEnabled()) {
    try {
      vpsDeployment = await activateVpsRelease(files);
    } catch (error) {
      console.error('[publish] VPS deployment failed:', error);
      try {
        if (site.published && previousAssets.length) {
          await activateVpsRelease(previousAssets.map((asset) => ({
            path: asset.path,
            contentType: asset.contentType,
            content: Buffer.from(asset.content),
            size: asset.size,
          })));
        } else {
          await undeployStaticSiteFromVps(site.id);
        }
      } catch (rollbackError) {
        console.error('[publish] Failed to restore previous VPS release:', rollbackError);
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'VPS deployment failed' },
        { status: 502 },
      );
    }
  }

  try {
    await publishSiteSnapshot(site.id, files);
  } catch (error) {
    // The VPS activation happened first so a VPS failure can never mark the DB
    // published. If the DB transaction fails, restore the previous release.
    if (vpsDeployment) {
      try {
        if (site.published && previousAssets.length) {
          await activateVpsRelease(
            previousAssets.map((asset) => ({
              path: asset.path,
              contentType: asset.contentType,
              content: Buffer.from(asset.content),
              size: asset.size,
            })),
          );
        } else {
          await undeployStaticSiteFromVps(site.id);
        }
      } catch (rollbackError) {
        console.error('[publish] Failed to compensate VPS deployment after DB failure:', rollbackError);
      }
    }
    console.error('[publish] Database publish transaction failed:', error);
    return NextResponse.json({ error: 'Publishing failed before it could be committed' }, { status: 500 });
  }

  const updatedSite = await prisma.site.findUniqueOrThrow({ where: { id: site.id } });
  return NextResponse.json({
    site: toSiteDto(updatedSite),
    publishedFiles: files.length,
    vpsDeployment,
  });
}
