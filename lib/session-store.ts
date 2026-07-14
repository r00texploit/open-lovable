/**
 * Database-backed Session Store
 *
 * Replaces global state for Fluid Compute compatibility.
 * All session data is stored in GenerationSession with proper tenant isolation.
 */

import { prisma } from '@/lib/db/prisma';

export type SessionStatus = 'creating' | 'running' | 'error' | 'terminated';

export interface SandboxSession {
  id: string;
  userId: string;
  siteId: string | null;
  sandboxId: string;
  sandboxProvider: string;
  sandboxUrl: string | null;
  rawSandboxUrl: string | null;
  sandboxName: string | null;
  sandboxRuntimeStatus: string | null;
  currentSnapshotId: string | null;
  status: SessionStatus;
  chatMessages: any[];
  conversationCtx: any | null;
  aiModel: string | null;
  fileCache: Record<string, any>;
  existingFiles: string[] | any; // Prisma returns String[]
  viteErrors: any[];
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SESSION_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000; // Durable resumable workspaces

/**
 * Create a new session. Upserts the user if they don't exist (handles JWT users
 * whose OAuth record hasn't been persisted yet).
 */
export async function createSession(
  userId: string,
  data: Partial<Omit<SandboxSession, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<SandboxSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  // Ensure user exists before creating session (FK constraint)
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: `user_${userId.slice(-8)}@placeholder.dev` },
  });

  const session = await prisma.generationSession.create({
    data: {
      userId,
      sandboxId: data.sandboxId || `sb_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      sandboxProvider: data.sandboxProvider || 'vercel',
      sandboxUrl: data.sandboxUrl || null,
      rawSandboxUrl: data.rawSandboxUrl || null,
      sandboxName: data.sandboxName || null,
      sandboxRuntimeStatus: data.sandboxRuntimeStatus || null,
      currentSnapshotId: data.currentSnapshotId || null,
      status: data.status || 'creating',
      chatMessages: data.chatMessages || [],
      conversationCtx: data.conversationCtx || null,
      aiModel: data.aiModel || null,
      fileCache: data.fileCache || {},
      existingFiles: data.existingFiles || [],
      viteErrors: data.viteErrors || [],
      siteId: data.siteId || null,
      // expiresAt is set by database default: dbgenerated("(now() + '24:00:00'::interval)")
    },
  });

  return session as unknown as SandboxSession;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<SandboxSession | null> {
  const session = await prisma.generationSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  // Check if session expired
  if (new Date() > session.expiresAt) {
    const refreshed = await updateSession(sessionId, {
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return refreshed;
  }

  return session as unknown as SandboxSession;
}

/**
 * Get session by sandbox ID
 */
export async function getSessionBySandboxId(sandboxId: string): Promise<SandboxSession | null> {
  const session = await prisma.generationSession.findUnique({
    where: { sandboxId },
  });

  if (!session) return null;

  // Check if session expired
  if (new Date() > session.expiresAt) {
    const refreshed = await updateSession(session.id, {
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return refreshed;
  }

  return session as unknown as SandboxSession;
}

/**
 * Update session data
 */
export async function updateSession(
  sessionId: string,
  data: Partial<Omit<SandboxSession, 'id' | 'createdAt'>>
): Promise<SandboxSession | null> {
  try {
    const session = await prisma.generationSession.update({
      where: { id: sessionId },
      data: {
        ...data,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return session as unknown as SandboxSession;
  } catch (error) {
    console.error('[updateSession] Failed to update session', sessionId, error);
    return null;
  }
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.generationSession.delete({
    where: { id: sessionId },
  }).catch(() => {}); // Ignore if not found
}

/**
 * Update sandbox info for session
 */
export async function setSessionSandbox(
  sessionId: string,
  sandboxId: string,
  provider: string,
  sandboxUrl?: string,
  rawSandboxUrl?: string,
  sandboxName?: string | null
): Promise<void> {
  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      sandboxId,
      sandboxProvider: provider,
      sandboxUrl: sandboxUrl || null,
      rawSandboxUrl: rawSandboxUrl || sandboxUrl || null,
      ...(sandboxName !== undefined ? { sandboxName } : {}),
      status: 'running',
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Get all sandboxes for a user (from their sessions)
 */
export async function getUserSandboxes(userId: string): Promise<SandboxSession[]> {
  const sessions = await prisma.generationSession.findMany({
    where: {
      userId,
      status: { in: ['running', 'creating'] },
    },
    orderBy: { lastActiveAt: 'desc' },
  });

  return sessions.map(s => ({
    ...s,
    existingFiles: Array.isArray(s.existingFiles) ? s.existingFiles : [],
  })) as unknown as SandboxSession[];
}

/**
 * Get sandbox by ID with user verification
 */
export async function getSandboxWithUser(sandboxId: string, userId: string): Promise<SandboxSession | null> {
  const session = await prisma.generationSession.findFirst({
    where: {
      sandboxId,
      userId,
    },
  });

  if (!session) return null;

  return {
    ...session,
    existingFiles: Array.isArray(session.existingFiles) ? session.existingFiles : [],
  } as unknown as SandboxSession;
}

/**
 * Add file to session tracking
 */
export async function addSessionFile(sessionId: string, filePath: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  // Prevent duplicates
  if (session.existingFiles.includes(filePath)) return;

  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      existingFiles: [...session.existingFiles, filePath],
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Update conversation context. Safe updateMany so no error if session missing.
 */
export async function updateConversationContext(
  sessionId: string,
  context: any
): Promise<void> {
  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      conversationCtx: context,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Update chat messages. Uses updateMany to avoid missing-record errors.
 */
export async function updateChatMessages(
  sessionId: string,
  messages: any[]
): Promise<void> {
  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      chatMessages: messages,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Add Vite error to session. Silently ignored if session doesn't exist.
 */
export async function addViteError(sessionId: string, error: any): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const errors = [...session.viteErrors, error].slice(-50); // Keep last 50

  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      viteErrors: errors,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Clear Vite errors
 */
export async function clearViteErrors(sessionId: string): Promise<void> {
  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      viteErrors: [],
      updatedAt: new Date(),
    },
  });
}

/**
 * Update file cache
 */
export async function updateFileCache(
  sessionId: string,
  filePath: string,
  content: string
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  const fileCache = {
    ...session.fileCache,
    [filePath]: {
      content,
      lastModified: Date.now(),
    },
  };

  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      fileCache,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.generationSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
      sandboxName: null,
      rawSandboxUrl: null,
    },
  });

  return result.count;
}

/**
 * Get session sandbox info
 * Returns null if session doesn't exist or has no sandbox
 */
export async function getSessionSandbox(sessionId: string): Promise<{
  sandboxId: string;
  provider: string;
  sandboxUrl: string | null;
  rawSandboxUrl: string | null;
  sandboxName: string | null;
} | null> {
  const session = await getSession(sessionId);
  if (!session?.sandboxId) return null;

  return {
    sandboxId: session.sandboxId,
    provider: session.sandboxProvider,
    sandboxUrl: session.sandboxUrl,
    rawSandboxUrl: session.rawSandboxUrl || session.sandboxUrl,
    sandboxName: session.sandboxName,
  };
}

/**
 * Touch session (update lastActiveAt). Silently ignored if not found.
 */
export async function touchSession(sessionId: string): Promise<void> {
  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      lastActiveAt: new Date(),
    },
  });
}

/**
 * Update session status. Silently ignored if session doesn't exist.
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  await prisma.generationSession.updateMany({
    where: { id: sessionId },
    data: {
      status,
      updatedAt: new Date(),
    },
  });
}
