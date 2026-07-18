import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { toSiteDto } from '@/lib/tenancy/site-dto';
import { updateSiteSchema } from '@/lib/validations/site';

async function getOwnedSite(siteId: string, userId: string) {
  return prisma.site.findFirst({
    where: {
      id: siteId,
      userId,
    },
  });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const site = await getOwnedSite(id, auth.user.id);
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  return NextResponse.json({ site: toSiteDto(site) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const site = await getOwnedSite(id, auth.user.id);
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = updateSiteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid site update' }, { status: 400 });
  }

  const nextSlug = parsed.data.slug;
  if (nextSlug && nextSlug !== site.slug) {
    const existing = await prisma.site.findFirst({
      where: {
        id: { not: site.id },
        OR: [{ slug: nextSlug }, { subdomain: nextSlug }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'That site slug is already taken' }, { status: 409 });
    }
  }

  if (typeof parsed.data.published === 'boolean') {
    return NextResponse.json(
      { error: 'Use the publish or unpublish endpoint to change publication status' },
      { status: 400 },
    );
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(nextSlug ? { slug: nextSlug, subdomain: nextSlug } : {}),
    },
  });

  return NextResponse.json({ site: toSiteDto(updated) });
}
