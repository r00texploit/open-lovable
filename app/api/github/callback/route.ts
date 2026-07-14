import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import {
  exchangeGitHubCode,
  getGitHubUser,
  storeGitHubConnection,
} from '@/lib/github/github-client';

/**
 * GitHub OAuth callback. Verifies the session, decodes state to get siteId,
 * exchanges the code, and stores the encrypted access token.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect('/auth/signin?callbackUrl=/settings');
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateParam = searchParams.get('state');

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    if (error) {
      console.error('[github/callback] OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/settings?github_error=${encodeURIComponent(error)}`);
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${baseUrl}/settings?github_error=missing_params`);
    }

    let state: { siteId?: string; nonce?: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf8'));
    } catch {
      return NextResponse.redirect(`${baseUrl}/settings?github_error=invalid_state`);
    }

    const { siteId } = state;
    if (!siteId) {
      return NextResponse.redirect(`${baseUrl}/settings?github_error=missing_site`);
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true, slug: true },
    });

    if (!site) {
      return NextResponse.redirect(`${baseUrl}/settings?github_error=site_not_found`);
    }

    const { accessToken, scope } = await exchangeGitHubCode(code);
    const user = await getGitHubUser(accessToken);

    await storeGitHubConnection({
      userId: session.user.id,
      siteId,
      accessToken,
      scope,
      githubLogin: user.login,
      githubUserId: user.id,
    });

    return NextResponse.redirect(
      `${baseUrl}/settings?github_connected=${encodeURIComponent(site.slug)}`
    );
  } catch (error) {
    console.error('[github/callback] Error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/settings?github_error=${encodeURIComponent(
        error instanceof Error ? error.message : 'unknown'
      )}`
    );
  }
}
