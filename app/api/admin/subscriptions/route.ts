import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import { TIERS, type SubscriptionTier } from '@/lib/stripe/stripe';

const PAGE_SIZE = 25;
const VALID_TIERS: SubscriptionTier[] = ['free', 'pro', 'plus', 'team'];
const VALID_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused', 'inactive'];

export async function GET(req: NextRequest) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const tier = url.searchParams.get('tier')?.trim() || '';
  const status = url.searchParams.get('status')?.trim() || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { stripeCustomerId: { contains: q, mode: 'insensitive' } },
      { stripeSubscriptionId: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (tier && tier !== 'all' && VALID_TIERS.includes(tier as SubscriptionTier)) {
    where.tier = tier;
  }
  if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
    where.status = status;
  }

  const [total, subscriptions, payingCounts] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.subscription.groupBy({
      by: ['tier'],
      where: { status: { in: ['active', 'trialing'] } },
      _count: { _all: true },
    }),
  ]);

  // MRR + per-tier paying counts.
  const perTier: Record<string, { count: number; mrr: number }> = {};
  for (const t of VALID_TIERS) perTier[t] = { count: 0, mrr: 0 };
  for (const row of payingCounts) {
    const t = row.tier as SubscriptionTier;
    if (!perTier[t]) continue;
    perTier[t].count = row._count._all;
    perTier[t].mrr = row._count._all * (TIERS[t]?.price || 0);
  }
  const totalMrr = Object.values(perTier).reduce((s, v) => s + v.mrr, 0);
  const payingTotal = Object.values(perTier).reduce((s, v) => s + v.count, 0);

  return NextResponse.json({
    subscriptions,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    summary: { perTier, totalMrr, payingTotal },
  });
}