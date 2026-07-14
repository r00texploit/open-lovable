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
  await publishSiteSnapshot(site.id, files);

  let vpsDeployment: { deployed: boolean; url: string } | null = null;
  if (isVpsDeploymentEnabled()) {
    try {
      vpsDeployment = await deployStaticSiteToVps(
        site.id,
        site.subdomain,
        files,
        site.customDomain
      );
    } catch (error) {
      console.error('[publish] VPS deployment failed; keeping DB snapshot as fallback:', error);
      // Don't fail the publish if the VPS deployment fails; the DB snapshot is
      // the fallback and site-host can still serve it.
    }
  }

  const updatedSite = await prisma.site.findUniqueOrThrow({ where: { id: site.id } });
  return NextResponse.json({
    site: toSiteDto(updatedSite),
    publishedFiles: files.length,
    vpsDeployment,
  });
}
