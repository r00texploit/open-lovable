import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { removeGitHubConnection } from '@/lib/github/github-client';

/**
 * Disconnect GitHub for a site.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const removed = await removeGitHubConnection(session.user.id, siteId);

    return NextResponse.json({ success: removed });
  } catch (error) {
    console.error('[github/disconnect] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect GitHub' },
      { status: 500 }
    );
  }
}
