/**
 * Sandbox-scoped state management for multi-sandbox support.
 * Replaces global singletons with sandbox-specific state.
 */

import type { SandboxState } from '@/types/sandbox';

// Initialize global maps if not already present
if (!global.sandboxStateMap) {
  global.sandboxStateMap = new Map<string, SandboxState>();
}
if (!global.activeSandboxMap) {
  global.activeSandboxMap = new Map<string, any>();
}

/**
 * Get state for a specific sandbox
 */
export function getSandboxState(sandboxId: string): SandboxState | undefined {
  return global.sandboxStateMap?.get(sandboxId);
}

/**
 * Set state for a specific sandbox
 */
export function setSandboxState(sandboxId: string, state: SandboxState): void {
  if (!global.sandboxStateMap) {
    global.sandboxStateMap = new Map();
  }
  global.sandboxStateMap.set(sandboxId, state);
}

/**
 * Get provider for a specific sandbox
 */
export function getSandboxProvider(sandboxId: string): any {
  return global.activeSandboxMap?.get(sandboxId);
}

/**
 * Set provider for a specific sandbox
 */
export function setSandboxProvider(sandboxId: string, provider: any): void {
  if (!global.activeSandboxMap) {
    global.activeSandboxMap = new Map();
  }
  global.activeSandboxMap.set(sandboxId, provider);
}

/**
 * Check if a sandbox has state
 */
export function hasSandboxState(sandboxId: string): boolean {
  return global.sandboxStateMap?.has(sandboxId) ?? false;
}

/**
 * Delete state for a specific sandbox (cleanup)
 */
export function deleteSandboxState(sandboxId: string): void {
  global.sandboxStateMap?.delete(sandboxId);
  global.activeSandboxMap?.delete(sandboxId);
}

/**
 * Get all sandbox IDs with state
 */
export function getAllSandboxIds(): string[] {
  return Array.from(global.sandboxStateMap?.keys() ?? []);
}

/**
 * Initialize sandbox state if not exists
 */
export function initSandboxState(sandboxId: string): SandboxState {
  let state = getSandboxState(sandboxId);
  if (!state) {
    state = {
      fileCache: {
        files: {},
        lastSync: Date.now(),
        sandboxId,
      },
      sandbox: null,
      sandboxData: null,
    };
    setSandboxState(sandboxId, state);
  }
  return state;
}

/**
 * Get file cache for a specific sandbox
 */
export function getSandboxFileCache(sandboxId: string): SandboxState['fileCache'] | null {
  return getSandboxState(sandboxId)?.fileCache ?? null;
}

/**
 * Update file in sandbox cache
 */
export function updateSandboxFile(sandboxId: string, filePath: string, content: string): void {
  const state = getSandboxState(sandboxId);
  if (state?.fileCache) {
    state.fileCache.files[filePath] = {
      content,
      lastModified: Date.now(),
    };
  }
}

/**
 * Set sandbox data (ID and URL)
 */
export function setSandboxData(
  sandboxId: string,
  data: { sandboxId: string; url: string }
): void {
  const state = getSandboxState(sandboxId);
  if (state) {
    state.sandboxData = data;
  }
}

/**
 * Legacy compatibility: Get active sandbox (from singleton)
 * @deprecated Use getSandboxProvider(sandboxId) instead
 */
export function getActiveSandboxLegacy(): any {
  return global.activeSandbox;
}

/**
 * Legacy compatibility: Get active sandbox state
 * @deprecated Use getSandboxState(sandboxId) instead
 */
export function getActiveSandboxStateLegacy(): SandboxState | undefined {
  return global.sandboxState;
}
