import { NextRequest, NextResponse } from 'next/server';
import { resolveRequestSandbox } from '@/lib/sandbox/resolve-request-sandbox';
import { getSandboxState, updateSandboxFile } from '@/lib/sandbox/sandbox-state';
import { updateSession, getSessionBySandboxId } from '@/lib/session-store';

export const maxDuration = 800;

export async function POST(request: NextRequest) {
  try {
    const { sandboxId, snapshot } = await request.json();

    if (!sandboxId || !snapshot || typeof snapshot !== 'object') {
      return NextResponse.json(
        { error: 'sandboxId and snapshot are required' },
        { status: 400 }
      );
    }

    const resolved = await resolveRequestSandbox(sandboxId);
    if (!resolved.ok) {
      return resolved.response;
    }

    const provider = resolved.value.provider;
    const effectiveSandboxId = resolved.value.sandboxId;
    const sandboxState = getSandboxState(effectiveSandboxId);

    const filesToRestore = Object.entries(snapshot as Record<string, string | null>);

    if (filesToRestore.length === 0) {
      return NextResponse.json({ success: true, restored: 0 });
    }

    const restored: string[] = [];
    const failed: string[] = [];

    for (const [filePath, content] of filesToRestore) {
      try {
        // Missing from snapshot means file did not exist before this edit.
        if (content === null) {
          // Best-effort delete: the file was created by the edit.
          await provider.runCommand(`rm -f "${filePath}"`);
          restored.push(filePath);
          if (sandboxState?.fileCache?.files) {
            delete sandboxState.fileCache.files[filePath];
          }
          continue;
        }

        const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
        if (dirPath) {
          await provider.runCommand(`mkdir -p ${dirPath}`);
        }

        await provider.writeFile(filePath, content);
        restored.push(filePath);

        if (sandboxState?.fileCache?.files) {
          sandboxState.fileCache.files[filePath] = {
            content,
            lastModified: Date.now(),
          };
        }
        updateSandboxFile(effectiveSandboxId, filePath, content);
      } catch (error) {
        console.error(`[revert-edit] Failed to restore ${filePath}:`, error);
        failed.push(filePath);
      }
    }

    // Persist reverted state to the session record so restore works across refreshes.
    try {
      const sessionRecord = resolved.value.session || await getSessionBySandboxId(effectiveSandboxId);
      if (sessionRecord?.id) {
        const existingDbCache = (sessionRecord.fileCache && typeof sessionRecord.fileCache === 'object')
          ? sessionRecord.fileCache as Record<string, any>
          : {};
        const mergedCache: Record<string, any> = { ...(existingDbCache.files ?? existingDbCache) };

        for (const [path, content] of filesToRestore) {
          if (content === null) {
            delete mergedCache[path];
          } else {
            mergedCache[path] = { content, lastModified: Date.now() };
          }
        }

        await updateSession(sessionRecord.id, { fileCache: mergedCache });
        console.log(`[revert-edit] Persisted ${Object.keys(mergedCache).length} files to session record ${sessionRecord.id}`);
      }
    } catch (persistError) {
      console.warn('[revert-edit] Failed to persist file cache to DB:', persistError);
    }

    if (failed.length > 0) {
      return NextResponse.json(
        { success: restored.length > 0, restored, failed, error: `Failed to restore ${failed.length} file(s)` },
        { status: restored.length > 0 ? 200 : 500 }
      );
    }

    return NextResponse.json({ success: true, restored });
  } catch (error) {
    console.error('[revert-edit] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revert edit' },
      { status: 500 }
    );
  }
}
