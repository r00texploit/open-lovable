import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import { toSiteDto } from '@/lib/tenancy/site-dto';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Admin can force-publish/unpublish; publishing requires assets to exist
  // (matches the constraint in the user-facing sites/[id] route).
  if (body?.published === true && !site.published) {
    const assetCount = await prisma.siteAsset.count({ where: { siteId: site.id } });
    if (assetCount === 0) {
      return NextResponse.json(
        { error: 'Site has no published assets to publish' },
        { status: 400 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (typeof body?.published === 'boolean') {
    data.published = body.published;
    if (body.published) data.lastPublishedAt = new Date();
  }
  if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim();

  const updated = await prisma.site.update({ where: { id }, data });
  return NextResponse.json({ site: toSiteDto(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id }, select: { id: true } });
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Cascade deletes assets + nullifies generationSessions (per schema relations).
  await prisma.site.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}