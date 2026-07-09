import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';

const PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const tier = url.searchParams.get('tier')?.trim() || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(url.searchParams.get('limit') || String(PAGE_SIZE), 10) || PAGE_SIZE),
  );

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (tier && tier !== 'all') {
    where.subscription = { tier };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        subscription: { select: { tier: true, status: true } },
        usage: { select: { generationsUsed: true, generationsLimit: true } },
        _count: {
          select: { sites: true, generationSessions: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}