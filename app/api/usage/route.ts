import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

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

    // Check if daily limit should reset
    const now = new Date();
    const resetDate = user.usage?.resetDate || now;
    const shouldReset = now.getDate() !== new Date(resetDate).getDate();

    if (shouldReset && user.usage) {
      await prisma.usage.update({
        where: { userId: user.id },
        data: {
          generationsUsed: 0,
          resetDate: now,
        },
      });
    }

    return NextResponse.json({
      used: shouldReset ? 0 : user.usage?.generationsUsed || 0,
      limit: user.usage?.generationsLimit || 3,
      tier: user.subscription?.tier || 'free',
      resetDate: shouldReset ? now : resetDate,
    });
  } catch (error) {
    console.error('[usage]', error);
    return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
  }
}

// Increment usage
export async function POST() {
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

    if (!user.usage) {
      return NextResponse.json({ error: 'No usage record' }, { status: 500 });
    }

    // Check if limit reached
    if (user.usage.generationsUsed >= user.usage.generationsLimit) {
      return NextResponse.json(
        { error: 'Daily limit reached', limitReached: true },
        { status: 429 }
      );
    }

    // Increment usage
    const updatedUsage = await prisma.usage.update({
      where: { userId: user.id },
      data: { generationsUsed: { increment: 1 } },
    });

    return NextResponse.json({
      used: updatedUsage.generationsUsed,
      limit: updatedUsage.generationsLimit,
      remaining: updatedUsage.generationsLimit - updatedUsage.generationsUsed,
    });
  } catch (error) {
    console.error('[usage]', error);
    return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 });
  }
}
