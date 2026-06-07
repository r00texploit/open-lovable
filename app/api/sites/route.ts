import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { createSiteSchema } from '@/lib/validations/site';
import { toSiteDto } from '@/lib/tenancy/site-dto';

export async function GET() {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sites = await prisma.site.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    sites: sites.map(toSiteDto),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createSiteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid site data' }, { status: 400 });
  }

  const { name, slug } = parsed.data;
  const existing = await prisma.site.findFirst({
    where: {
      OR: [{ slug }, { subdomain: slug }],
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'That site slug is already taken' }, { status: 409 });
  }

  const site = await prisma.site.create({
    data: {
      userId: auth.user.id,
      name,
      slug,
      subdomain: slug,
    },
  });

  return NextResponse.json({ site: toSiteDto(site) }, { status: 201 });
}
