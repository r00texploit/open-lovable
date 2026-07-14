import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';
import { getGitHubTokenForSite, pushSiteChanges } from '@/lib/github/github-client';

const IGNORED_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^\.next\//,
  /^dist\//,
  /^build\//,
  /^\.DS_Store$/,
  /\.log$/,
];

function shouldIncludeFile(path: string): boolean {
  return !IGNORED_PATTERNS.some((pattern) => pattern.test(path));
}

/**
 * Push the current sandbox files to the default GitHub repo for a site.
 * The default repo is named after the site slug under the connected user.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { siteId, sandboxId } = body;

    if (!siteId || !sandboxId) {
      return NextResponse.json({ error: 'siteId and sandboxId are required' }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
      select: { id: true, slug: true, name: true },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const auth = await getGitHubTokenForSite(session.user.id, siteId);
    if (!auth) {
      return NextResponse.json({ error: 'GitHub not connected for this site' }, { status: 400 });
    }

    const resolved = await resolveRequestSandbox(sandboxId);
    if (!resolved.ok) {
      return resolved.response;
    }

    let files: Record<string, string> = {};
    const providedFiles = body.files;
    const hasProvidedFiles =
      providedFiles && typeof providedFiles === 'object' && !Array.isArray(providedFiles) && Object.keys(providedFiles).length > 0;

    if (hasProvidedFiles) {
      for (const [path, content] of Object.entries(providedFiles)) {
        if (typeof content === 'string' && shouldIncludeFile(path)) {
          files[path] = content;
        }
      }
    } else {
      const provider = resolved.value.provider;
      const listResult = await provider.listFiles();

      for (const filePath of listResult) {
        if (!shouldIncludeFile(filePath)) continue;
        try {
          const content = await provider.readFile(filePath);
          files[filePath] = content;
        } catch (error) {
          console.warn(`[github/push] Skipping ${filePath}:`, error);
        }
      }
    }

    const result = await pushSiteChanges(
      auth.token,
      site.slug,
      files,
      `Push from Noeron — ${site.name || site.slug}`
    );

    return NextResponse.json({
      success: result.failed.length === 0,
      repoUrl: result.repo.htmlUrl,
      pushed: result.pushed,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[github/push] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to push to GitHub' },
      { status: 500 }
    );
  }
}
