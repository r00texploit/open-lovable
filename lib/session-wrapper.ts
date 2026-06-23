/**
 * Session Wrapper - Replaces Global State
 *
 * Provides a backwards-compatible wrapper around the database session store
 * to replace global state usage in API routes.
 */

import {
  getSession,
  updateSession,
  updateFileCache,
  addSessionFile,
  updateConversationContext,
  addViteError,
  clearViteErrors,
  updateChatMessages,
  touchSession,
  SandboxSession,
} from './session-store';

// In-memory cache for the current request only (not global!)
const requestCache = new WeakMap<Request, Map<string, any>>();

function getCacheForRequest(request: Request): Map<string, any> {
  if (!requestCache.has(request)) {
    requestCache.set(request, new Map());
  }
  return requestCache.get(request)!;
}

/**
 * Get session data with caching
 */
export async function getSessionData(
  request: Request,
  sessionId: string
): Promise<SandboxSession | null> {
  const cache = getCacheForRequest(request);

  if (cache.has(`session_${sessionId}`)) {
    return cache.get(`session_${sessionId}`);
  }

  const session = await getSession(sessionId);
  if (session) {
    cache.set(`session_${sessionId}`, session);
  }
  return session;
}

/**
 * Get existing files set
 * Replaces: global.existingFiles
 */
export async function getExistingFiles(
  request: Request,
  sessionId: string
): Promise<Set<string>> {
  const session = await getSessionData(request, sessionId);
  return new Set(session?.existingFiles || []);
}

/**
 * Add file to existing files
 * Replaces: global.existingFiles.add(path)
 */
export async function addExistingFile(
  sessionId: string,
  filePath: string
): Promise<void> {
  await addSessionFile(sessionId, filePath);
}

/**
 * Get conversation state
 * Replaces: global.conversationState
 */
export async function getConversationState(
  request: Request,
  sessionId: string
): Promise<any | null> {
  const session = await getSessionData(request, sessionId);
  return session?.conversationCtx || null;
}

/**
 * Set conversation state
 * Replaces: global.conversationState = {...}
 */
export async function setConversationState(
  sessionId: string,
  state: any
): Promise<void> {
  await updateConversationContext(sessionId, state);
}

/**
 * Get Vite errors
 * Replaces: global.viteErrors
 */
export async function getViteErrors(
  request: Request,
  sessionId: string
): Promise<any[]> {
  const session = await getSessionData(request, sessionId);
  return session?.viteErrors || [];
}

/**
 * Add Vite error
 * Replaces: global.viteErrors.push(error)
 */
export async function pushViteError(
  sessionId: string,
  error: any
): Promise<void> {
  await addViteError(sessionId, error);
}

/**
 * Clear Vite errors
 * Replaces: global.viteErrors = []
 */
export async function clearSessionViteErrors(sessionId: string): Promise<void> {
  await clearViteErrors(sessionId);
}

/**
 * Get chat messages
 */
export async function getChatMessages(
  request: Request,
  sessionId: string
): Promise<any[]> {
  const session = await getSessionData(request, sessionId);
  return session?.chatMessages || [];
}

/**
 * Set chat messages
 */
export async function setChatMessages(
  sessionId: string,
  messages: any[]
): Promise<void> {
  await updateChatMessages(sessionId, messages);
}

/**
 * Update file cache
 */
export async function setSandboxFileCache(
  sessionId: string,
  filePath: string,
  content: string
): Promise<void> {
  await updateFileCache(sessionId, filePath, content);
}

/**
 * Touch session to update lastActiveAt
 */
export async function touchSessionData(sessionId: string): Promise<void> {
  await touchSession(sessionId);
}

/**
 * Session guard - ensures session belongs to user
 */
export async function requireSession(
  request: Request,
  sessionId: string,
  userId?: string
): Promise<SandboxSession | null> {
  const session = await getSessionData(request, sessionId);

  if (!session) return null;

  if (userId && session.userId !== userId) {
    console.error(`[SECURITY] Session ${sessionId} accessed by wrong user`);
    return null;
  }

  return session;
}
