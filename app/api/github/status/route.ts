import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

/**
 * Get the GitHub connection status for a site. Returns the masked connection
 * or null if none exists.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true, slug: true },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const connection = await prisma.gitHubConnection.findFirst({
      where: { siteId, userId: session.user.id },
      select: {
        id: true,
        scope: true,
        githubLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      connected: !!connection,
      siteId,
      siteSlug: site.slug,
      connection,
    });
  } catch (error) {
    console.error('[github/status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get GitHub status' },
      { status: 500 }
    );
  }
}
