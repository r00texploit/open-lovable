import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const status = url.searchParams.get('status')?.trim() || ''; // 'active' | 'expired' | 'other'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const now = new Date();

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { sandboxId: { contains: q, mode: 'insensitive' } },
      { sandboxName: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (status === 'active') {
    where.status = { notIn: ['killed', 'failed'] };
    where.expiresAt = { gt: now };
  } else if (status === 'expired') {
    where.expiresAt = { lte: now };
  }

  const [total, sessions] = await Promise.all([
    prisma.generationSession.count({ where }),
    prisma.generationSession.findMany({
      where,
      orderBy: { lastActiveAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, name: true } },
        site: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const rows = sessions.map((s) => ({
    id: s.id,
    sandboxId: s.sandboxId,
    sandboxProvider: s.sandboxProvider,
    sandboxUrl: s.sandboxUrl,
    sandboxName: s.sandboxName,
    sandboxRuntimeStatus: s.sandboxRuntimeStatus,
    status: s.status,
    aiModel: s.aiModel,
    lastActiveAt: s.lastActiveAt,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
    isExpired: s.expiresAt <= now,
    user: s.user,
    site: s.site,
  }));

  return NextResponse.json({
    sessions: rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}