import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import { toSiteDto } from '@/lib/tenancy/site-dto';
import { isVpsDeploymentEnabled, terminateSandboxOnVps, undeployStaticSiteFromVps } from '@/lib/vps-deployments';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  if (body?.published === true) {
    return NextResponse.json({ error: 'Republish from the generation workspace' }, { status: 400 });
  }
  if (body?.published === false && site.published && isVpsDeploymentEnabled()) {
    try {
      await undeployStaticSiteFromVps(site.id);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'VPS undeployment failed' },
        { status: 502 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (typeof body?.published === 'boolean') {
    data.published = body.published;
  }
  if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim();

  const updated = await prisma.site.update({ where: { id }, data });
  return NextResponse.json({ site: toSiteDto(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const site = await prisma.site.findUnique({
    where: { id },
    select: { id: true, generationSessions: { select: { sandboxId: true } } },
  });
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  try {
    if (isVpsDeploymentEnabled()) await undeployStaticSiteFromVps(site.id);
    for (const session of site.generationSessions) await terminateSandboxOnVps(session.sandboxId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove VPS resources' },
      { status: 502 },
    );
  }

  await prisma.site.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
