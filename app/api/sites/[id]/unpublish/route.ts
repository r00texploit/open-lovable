import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/server';
import { toSiteDto } from '@/lib/tenancy/site-dto';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      published: false,
    },
  });

  return NextResponse.json({ site: toSiteDto(updated) });
}
