import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';
import { getGitHubTokenForSite, getRepo, pullFiles } from '@/lib/github/github-client';
import { getSandboxState } from '@/lib/sandbox/sandbox-state';
import { updateSession } from '@/lib/session-store';

/**
 * Pull files from the default GitHub repo for a site and write them into the
 * live sandbox and the durable file cache.
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
      select: { id: true, slug: true },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const auth = await getGitHubTokenForSite(session.user.id, siteId);
    if (!auth) {
      return NextResponse.json({ error: 'GitHub not connected for this site' }, { status: 400 });
    }

    const user = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${auth.token}` },
    }).then((r) => r.json());

    const owner = user.login;
    const repoName = `noeron-${site.slug}`;
    const repo = await getRepo(auth.token, owner, repoName);
    if (!repo) {
      return NextResponse.json({ error: `Repo ${owner}/${repoName} not found` }, { status: 404 });
    }

    const files = await pullFiles(auth.token, repo.owner, repo.name, repo.defaultBranch);

    const resolved = await resolveRequestSandbox(sandboxId);
    if (!resolved.ok) {
      return resolved.response;
    }

    const provider = resolved.value.provider;
    const written: string[] = [];
    const failed: string[] = [];

    for (const [path, content] of Object.entries(files)) {
      try {
        const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
        if (dirPath) {
          await provider.runCommand(`mkdir -p ${dirPath}`);
        }
        await provider.writeFile(path, content);
        written.push(path);
      } catch (error) {
        console.error(`[github/pull] Failed to write ${path}:`, error);
        failed.push(path);
      }
    }

    // Update in-memory and DB file cache.
    const sandboxState = getSandboxState(resolved.value.sandboxId);
    const cache: Record<string, { content: string; lastModified: number }> = {};
    for (const [path, content] of Object.entries(files)) {
      if (written.includes(path)) {
        cache[path] = { content, lastModified: Date.now() };
      }
    }

    if (sandboxState?.fileCache?.files) {
      Object.assign(sandboxState.fileCache.files, cache);
      sandboxState.fileCache.lastSync = Date.now();
    }

    try {
      const sessionRecord = resolved.value.session;
      if (sessionRecord?.id) {
        const existingDbCache = (sessionRecord.fileCache && typeof sessionRecord.fileCache === 'object')
          ? sessionRecord.fileCache as Record<string, any>
          : {};
        await updateSession(sessionRecord.id, {
          fileCache: { ...(existingDbCache.files ?? existingDbCache), ...cache },
        });
      }
    } catch (persistError) {
      console.warn('[github/pull] Failed to persist file cache to DB:', persistError);
    }

    return NextResponse.json({
      success: failed.length === 0,
      repoUrl: repo.htmlUrl,
      written,
      failed,
    });
  } catch (error) {
    console.error('[github/pull] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pull from GitHub' },
      { status: 500 }
    );
  }
}
