import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { getNormalizedSubscriptionState, incrementTokenUsage } from '@/lib/usage/token-usage';

// Get current usage
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { usage: true, subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { subscription, usage } = await getNormalizedSubscriptionState(user.id);

    return NextResponse.json({
      used: usage.generationsUsed,
      limit: usage.generationsLimit,
      tier: subscription.tier,
      unit: 'tokens',
      period: 'month',
      resetDate: usage.resetDate,
    });
  } catch (error) {
    console.error('[usage]', error);
    return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
  }
}

// Increment usage
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { usage: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const tokens = Math.max(1, Math.ceil(Number(body.tokens) || 1000));
    const result = await incrementTokenUsage(user.id, tokens);

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Monthly token limit reached', limitReached: true, upgradeUrl: '/pricing' },
        { status: 429 }
      );
    }

    return NextResponse.json({
      used: result.usage.generationsUsed,
      limit: result.usage.generationsLimit,
      remaining: result.remaining,
      unit: 'tokens',
      period: 'month',
    });
  } catch (error) {
    console.error('[usage]', error);
    return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 });
  }
}
