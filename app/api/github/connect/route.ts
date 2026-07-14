import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { buildGitHubAuthUrl } from '@/lib/github/github-client';

/**
 * Start GitHub OAuth for a site. Requires the caller to own the site.
 * Returns a redirect to GitHub's authorization endpoint with state encoded
 * as base64 JSON containing siteId and a random nonce.
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
      select: { id: true },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/github/callback`;
    const statePayload = {
      siteId,
      nonce: crypto.randomUUID(),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const authUrl = buildGitHubAuthUrl({
      redirectUri,
      state,
      scope: 'repo',
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[github/connect] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start GitHub OAuth' },
      { status: 500 }
    );
  }
}
