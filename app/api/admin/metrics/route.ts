import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import { TIERS } from '@/lib/stripe/stripe';

export async function GET() {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const [
    totalUsers,
    totalSites,
    publishedSites,
    activeSandboxes,
    payingSubs,
    usageRows,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.site.count(),
    prisma.site.count({ where: { published: true } }),
    prisma.generationSession.count({
      where: { status: { not: 'killed' }, expiresAt: { gt: new Date() } },
    }),
    prisma.subscription.count({
      where: { tier: { not: 'free' }, status: { in: ['active', 'trialing'] } },
    }),
    prisma.usage.findMany({ select: { generationsUsed: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, email: true, name: true, createdAt: true },
    }),
  ]);

  const totalTokensUsed = usageRows.reduce((sum, u) => sum + (u.generationsUsed || 0), 0);

  // MRR estimate: sum of monthly tier prices for active non-free subscriptions.
  const activeSubRows = await prisma.subscription.findMany({
    where: { tier: { not: 'free' }, status: { in: ['active', 'trialing'] } },
    select: { tier: true, stripePriceId: true },
  });
  const monthlyMrr = activeSubRows.reduce((sum, s) => {
    const tier = s.tier as keyof typeof TIERS;
    return sum + (TIERS[tier]?.price || 0);
  }, 0);

  // 30-day signups time series.
  const now = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  const from30 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  const signups = await prisma.user.findMany({
    where: { createdAt: { gte: from30 } },
    select: { createdAt: true },
  });
  for (const u of signups) {
    const key = u.createdAt.toISOString().slice(0, 10);
    const bucket = days.find((d) => d.date === key);
    if (bucket) bucket.count += 1;
  }

  return NextResponse.json({
    totals: {
      users: totalUsers,
      sites: totalSites,
      publishedSites,
      activeSandboxes,
      payingSubs,
      totalTokensUsed,
      mrrUsd: monthlyMrr,
    },
    signups30d: days,
    recentSignups,
  });
}