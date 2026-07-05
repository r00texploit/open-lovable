/**
 * Session Helper Functions
 * 
 * Helper functions to replace global state access in complex routes.
 * These provide a clean migration path from global.* to session-based storage.
 */

import { getSession, getSessionBySandboxId, updateSession, updateFileCache, addSessionFile, updateConversationContext } from './session-store';
import type { SandboxSession } from './session-store';
import type { ConversationState, ConversationMessage, ConversationEdit } from '@/types/conversation';
import type { FileManifest } from '@/types/file-manifest';
import type { SandboxState } from '@/types/sandbox';

export function createEmptyConversationState(): ConversationState {
  return {
    conversationId: `conv-${Date.now()}`,
    startedAt: Date.now(),
    lastUpdated: Date.now(),
    context: {
      messages: [],
      edits: [],
      projectEvolution: { majorChanges: [] },
      userPreferences: {}
    }
  };
}

/**
 * Resolve the GenerationSession that owns a conversation, by sandbox ID first
 * and falling back to the user's most recent session. When userId is provided,
 * a sandbox match belonging to a different user is rejected.
 */
export async function resolveConversationSession(
  sandboxId?: string | null,
  userId?: string | null
): Promise<SandboxSession | null> {
  if (sandboxId && sandboxId !== 'default') {
    const bySandbox = await getSessionBySandboxId(sandboxId);
    if (bySandbox && (!userId || bySandbox.userId === userId)) {
      return bySandbox;
    }
  }

  if (userId) {
    const { prisma } = await import('@/lib/db/prisma');
    const latest = await prisma.generationSession.findFirst({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });
    return (latest as unknown as SandboxSession) || null;
  }

  return null;
}

/**
 * Get or initialize conversation state for a session.
 * Accepts either a session ID or a user ID; if the ID doesn't match a session
 * directly, falls back to the user's most-recent active session.
 */
export async function getOrInitConversationState(
  sessionId: string,
  userId: string
): Promise<ConversationState> {
  let session = await getSession(sessionId);

  // Fallback: sessionId might actually be a userId, or session was deleted
  if (!session && userId) {
    const { prisma } = await import('@/lib/db/prisma');
    const latest = await prisma.generationSession.findFirst({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });
    if (latest) session = latest as unknown as SandboxSession;
  }

  if (session?.conversationCtx) {
    return session.conversationCtx as ConversationState;
  }

  // Initialize new conversation state (no DB update needed if no session)
  const newState = createEmptyConversationState();

  if (session) {
    await updateConversationContext(session.id, newState);
  }
  return newState;
}

/**
 * Add a message to conversation history. Returns early if no session found.
 */
export async function addConversationMessage(
  sessionId: string,
  message: ConversationMessage,
  maxMessages: number = 50
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    console.warn('[addConversationMessage] No session found for', sessionId, '- skipping');
    return;
  }
  
  const state = (session.conversationCtx || {}) as ConversationState;
  const messages = state.context?.messages || [];
  messages.push(message);
  
  // Trim if too long
  if (messages.length > maxMessages) {
    const trimmed = messages.slice(-Math.floor(maxMessages * 0.75));
    state.context.messages = trimmed;
  }
  
  state.lastUpdated = Date.now();
  await updateConversationContext(sessionId, state);
}

/**
 * Add an edit to conversation history
 */
export async function addConversationEdit(
  sessionId: string,
  edit: ConversationEdit,
  maxEdits: number = 10
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;
  
  const state = (session.conversationCtx || {}) as ConversationState;
  const edits = state.context?.edits || [];
  edits.push(edit);
  
  // Trim if too long
  if (edits.length > maxEdits) {
    state.context.edits = edits.slice(-Math.floor(maxEdits * 0.8));
  }
  
  state.lastUpdated = Date.now();
  await updateConversationContext(sessionId, state);
}

/**
 * Get sandbox state from session (file cache, manifest).
 * If `sessionId` doesn't match a session directly, falls back to the user's
 * most-recent active session so that callers passing a userId still work.
 */
export async function getSandboxStateFromSession(
  sessionId: string
): Promise<SandboxState | null> {
  let session = await getSession(sessionId);

  if (!session) {
    const { prisma } = await import('@/lib/db/prisma');
    const latest = await prisma.generationSession.findFirst({
      where: { userId: sessionId },
      orderBy: { lastActiveAt: 'desc' },
    });
    if (latest) session = latest as unknown as SandboxSession;
  }

  if (!session) return null;
  
  return {
    fileCache: {
      files: session.fileCache || {},
      lastSync: Date.now(),
      sandboxId: session.sandboxId || '',
      manifest: session.fileCache?.manifest as FileManifest
    },
    sandbox: null, // Provider should be reconnected separately
    sandboxData: session.sandboxId ? {
      sandboxId: session.sandboxId,
      url: session.rawSandboxUrl || session.sandboxUrl || '',
      previewUrl: session.sandboxUrl || undefined,
      sandboxName: session.sandboxName || undefined,
    } : null
  };
}

/**
 * Update sandbox file cache
 */
export async function updateSandboxFileCache(
  sessionId: string,
  filePath: string,
  content: string
): Promise<void> {
  await updateFileCache(sessionId, filePath, content);
}

/**
 * Check if file exists in session
 */
export async function sessionFileExists(
  sessionId: string,
  filePath: string
): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;
  return session.existingFiles?.includes(filePath) || false;
}

/**
 * Add file to session tracking
 */
export async function trackSessionFile(
  sessionId: string,
  filePath: string
): Promise<void> {
  await addSessionFile(sessionId, filePath);
}

/**
 * Get existing files as Set (for compatibility)
 */
export async function getSessionFilesAsSet(
  sessionId: string
): Promise<Set<string>> {
  const session = await getSession(sessionId);
  return new Set(session?.existingFiles || []);
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(
  sessionId: string
): Promise<ConversationMessage[]> {
  const session = await getSession(sessionId);
  const state = session?.conversationCtx as ConversationState;
  return state?.context?.messages || [];
}

/**
 * Get conversation edits
 */
export async function getConversationEdits(
  sessionId: string
): Promise<ConversationEdit[]> {
  const session = await getSession(sessionId);
  const state = session?.conversationCtx as ConversationState;
  return state?.context?.edits || [];
}

/**
 * Track major project change
 */
export async function trackProjectChange(
  sessionId: string,
  change: { description: string; filesAffected: string[] }
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;
  
  const state = (session.conversationCtx || {}) as ConversationState;
  if (!state.context.projectEvolution) {
    state.context.projectEvolution = { majorChanges: [] };
  }
  
  state.context.projectEvolution.majorChanges.push({
    timestamp: Date.now(),
    ...change
  });
  
  // Keep only recent changes
  if (state.context.projectEvolution.majorChanges.length > 10) {
    state.context.projectEvolution.majorChanges = 
      state.context.projectEvolution.majorChanges.slice(-8);
  }
  
  state.lastUpdated = Date.now();
  await updateConversationContext(sessionId, state);
}

/**
 * Get file cache manifest
 */
export async function getSessionManifest(
  sessionId: string
): Promise<FileManifest | undefined> {
  const session = await getSession(sessionId);
  return session?.fileCache?.manifest as FileManifest | undefined;
}

/**
 * Get file from cache
 */
export async function getSessionFileContent(
  sessionId: string,
  filePath: string
): Promise<{ content: string; lastModified: number } | undefined> {
  const session = await getSession(sessionId);
  return session?.fileCache?.[filePath];
}

/**
 * Analyze user preferences from conversation
 */
export async function analyzeUserPreferencesFromSession(
  sessionId: string
): Promise<{
  commonPatterns: string[];
  preferredEditStyle: 'targeted' | 'comprehensive';
}> {
  const messages = await getConversationMessages(sessionId);
  const userMessages = messages.filter(m => m.role === 'user');
  const patterns: string[] = [];
  
  let targetedEditCount = 0;
  let comprehensiveEditCount = 0;
  
  userMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    
    if (content.match(/\b(update|change|fix|modify|edit|remove|delete)\s+(\w+\s+)?(\w+)\b/)) {
      targetedEditCount++;
    }
    
    if (content.match(/\b(rebuild|recreate|redesign|overhaul|refactor)\b/)) {
      comprehensiveEditCount++;
    }
    
    if (content.includes('hero')) patterns.push('hero section edits');
    if (content.includes('header')) patterns.push('header modifications');
    if (content.includes('color') || content.includes('style')) patterns.push('styling changes');
    if (content.includes('button')) patterns.push('button updates');
    if (content.includes('animation')) patterns.push('animation requests');
  });
  
  return {
    commonPatterns: [...new Set(patterns)].slice(0, 3),
    preferredEditStyle: targetedEditCount > comprehensiveEditCount ? 'targeted' : 'comprehensive'
  };
}
