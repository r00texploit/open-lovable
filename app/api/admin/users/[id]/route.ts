import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminOr403 } from '@/lib/auth/admin';
import { ensureFreeEntitlements } from '@/lib/usage/token-usage';
import { getTokenLimitForTier, type SubscriptionTier } from '@/lib/stripe/stripe';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      subscription: true,
      usage: true,
      _count: { select: { sites: true, generationSessions: true, generations: true } },
    },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user });
}

const VALID_TIERS: SubscriptionTier[] = ['free', 'pro', 'plus', 'team'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOr403();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  // Target user must exist.
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (action === 'setTier') {
    const tier = body?.tier as string;
    if (!VALID_TIERS.includes(tier as SubscriptionTier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    const tokenLimit = getTokenLimitForTier(tier);
    await prisma.$transaction([
      prisma.subscription.upsert({
        where: { userId: id },
        create: { userId: id, tier, status: 'active' },
        update: { tier },
      }),
      prisma.usage.upsert({
        where: { userId: id },
        create: { userId: id, generationsUsed: 0, generationsLimit: tokenLimit, resetDate: new Date() },
        update: { generationsLimit: tokenLimit },
      }),
    ]);
    return NextResponse.json({ ok: true, tier });
  }

  if (action === 'setLimit') {
    const limit = Number(body?.limit);
    if (!Number.isFinite(limit) || limit < 0) {
      return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
    }
    // Ensure a usage row exists.
    await ensureFreeEntitlements(id);
    await prisma.usage.update({
      where: { userId: id },
      data: { generationsLimit: Math.floor(limit) },
    });
    return NextResponse.json({ ok: true, limit: Math.floor(limit) });
  }

  if (action === 'resetUsage') {
    await ensureFreeEntitlements(id);
    await prisma.usage.update({
      where: { userId: id },
      data: { generationsUsed: 0, resetDate: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}