import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import { toSiteDto } from '@/lib/tenancy/site-dto';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const published = url.searchParams.get('published'); // 'true' | 'false' | null
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { customDomain: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (published === 'true') where.published = true;
  if (published === 'false') where.published = false;

  const [total, sites] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { assets: true, generationSessions: true } },
      },
    }),
  ]);

  return NextResponse.json({
    sites: sites.map((s) => ({ ...toSiteDto(s), user: s.user, assetCount: s._count.assets })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}