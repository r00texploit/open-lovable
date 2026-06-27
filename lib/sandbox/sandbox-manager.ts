import { SandboxProvider } from './types';
import { SandboxFactory } from './factory';
import { globalRecreationTracker } from './health-monitor';
import { classifyError, SANDBOX_ERRORS } from '@/lib/errors/sandbox-errors';

interface SandboxInfo {
  sandboxId: string;
  provider: SandboxProvider;
  createdAt: Date;
  lastAccessed: Date;
  recreationAttempts: number;
  lastRecreationError?: string;
}

class SandboxManager {
  private sandboxes: Map<string, SandboxInfo> = new Map();
  private activeSandboxId: string | null = null;

  /**
   * Get or create a sandbox provider for the given sandbox ID
   */
  async getOrCreateProvider(sandboxId: string): Promise<SandboxProvider> {
    // Check if we already have this sandbox
    const existing = this.sandboxes.get(sandboxId);
    if (existing) {
      existing.lastAccessed = new Date();
      return existing.provider;
    }

    // Try to reconnect to the existing sandbox
    try {
      const provider = await SandboxFactory.create();
      // Both VercelProvider and E2BProvider expose a reconnect(sandboxId) method
      if (typeof (provider as any).reconnect === 'function') {
        await (provider as any).reconnect(sandboxId);
        this.sandboxes.set(sandboxId, {
          sandboxId,
          provider,
          createdAt: new Date(),
          lastAccessed: new Date(),
          recreationAttempts: 0
        });
        this.activeSandboxId = sandboxId;
        console.log(`[SandboxManager] Reconnected to sandbox ${sandboxId}`);
        return provider;
      }
      return provider;
    } catch (error) {
      console.error(`[SandboxManager] Error reconnecting to sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  /**
   * Register a new sandbox
   */
  registerSandbox(sandboxId: string, provider: SandboxProvider): void {
    this.sandboxes.set(sandboxId, {
      sandboxId,
      provider,
      createdAt: new Date(),
      lastAccessed: new Date(),
      recreationAttempts: 0
    });
    this.activeSandboxId = sandboxId;
  }

  /**
   * Check if sandbox recreation is allowed (circuit breaker pattern)
   */
  canRecreateSandbox(sandboxId: string): { allowed: boolean; reason?: string } {
    const { allowed, attempts, remaining } = globalRecreationTracker.recordAttempt(sandboxId);

    if (!allowed) {
      return {
        allowed: false,
        reason: `Sandbox has been recreated ${attempts} times in the last 5 minutes. This indicates a persistent issue with the code. Please try a different request or contact support if the issue persists.`
      };
    }

    if (attempts > 1) {
      console.warn(`[SandboxManager] Sandbox ${sandboxId} recreation attempt ${attempts}/3 (${remaining} remaining)`);
    }

    return { allowed: true };
  }

  /**
   * Record a sandbox recreation attempt
   */
  recordRecreationAttempt(sandboxId: string, errorMessage?: string): void {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.recreationAttempts++;
      sandbox.lastRecreationError = errorMessage;
    }

    const { allowed, attempts } = globalRecreationTracker.recordAttempt(sandboxId);
    console.log(`[SandboxManager] Recorded recreation attempt for ${sandboxId} (attempt ${attempts}, allowed: ${allowed})`);
  }

  /**
   * Get recreation stats for a sandbox
   */
  getRecreationStats(sandboxId: string): { attempts: number; withinWindow: boolean; canRecreate: boolean } {
    const stats = globalRecreationTracker.getStats(sandboxId);
    return {
      attempts: stats.attempts,
      withinWindow: stats.withinWindow,
      canRecreate: globalRecreationTracker.canRecreate(sandboxId)
    };
  }

  /**
   * Reset recreation tracking for a sandbox (use when issue is resolved)
   */
  resetRecreationTracking(sandboxId: string): void {
    globalRecreationTracker.reset(sandboxId);
    console.log(`[SandboxManager] Reset recreation tracking for ${sandboxId}`);
  }

  /**
   * Handle sandbox error with automatic recovery decision
   */
  handleSandboxError(sandboxId: string, error: Error | string): {
    shouldRecreate: boolean;
    shouldRetry: boolean;
    userMessage: string;
    errorCode: string;
  } {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorInfo = classifyError(errorMessage);

    console.log(`[SandboxManager] Handling error for ${sandboxId}:`, {
      code: errorInfo.code,
      severity: errorInfo.severity,
      action: errorInfo.action,
      message: errorMessage.substring(0, 200)
    });

    // Check if we've hit the recreation limit
    if (errorInfo.action === 'recreate-sandbox') {
      const { allowed, reason } = this.canRecreateSandbox(sandboxId);
      if (!allowed) {
        return {
          shouldRecreate: false,
          shouldRetry: false,
          userMessage: reason || 'Too many recovery attempts. Please try a different request.',
          errorCode: 'RECREATION_LOOP_DETECTED'
        };
      }
    }

    return {
      shouldRecreate: errorInfo.action === 'recreate-sandbox',
      shouldRetry: errorInfo.retryable && errorInfo.autoRecoverable,
      userMessage: errorInfo.userAction || errorInfo.message,
      errorCode: errorInfo.code
    };
  }

  /**
   * Get the active sandbox provider
   */
  getActiveProvider(): SandboxProvider | null {
    if (!this.activeSandboxId) {
      return null;
    }
    
    const sandbox = this.sandboxes.get(this.activeSandboxId);
    if (sandbox) {
      sandbox.lastAccessed = new Date();
      return sandbox.provider;
    }
    
    return null;
  }

  /**
   * Get a specific sandbox provider
   */
  getProvider(sandboxId: string): SandboxProvider | null {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.lastAccessed = new Date();
      return sandbox.provider;
    }
    return null;
  }

  /**
   * Set the active sandbox
   */
  setActiveSandbox(sandboxId: string): boolean {
    if (this.sandboxes.has(sandboxId)) {
      this.activeSandboxId = sandboxId;
      return true;
    }
    return false;
  }

  /**
   * Terminate a sandbox
   */
  async terminateSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      try {
        await sandbox.provider.terminate();
      } catch (error) {
        console.error(`[SandboxManager] Error terminating sandbox ${sandboxId}:`, error);
      }
      this.sandboxes.delete(sandboxId);
      
      if (this.activeSandboxId === sandboxId) {
        this.activeSandboxId = null;
      }
    }
  }

  /**
   * Terminate all sandboxes
   */
  async terminateAll(): Promise<void> {
    const promises = Array.from(this.sandboxes.values()).map(sandbox => 
      sandbox.provider.terminate().catch(err => 
        console.error(`[SandboxManager] Error terminating sandbox ${sandbox.sandboxId}:`, err)
      )
    );
    
    await Promise.all(promises);
    this.sandboxes.clear();
    this.activeSandboxId = null;
  }

  /**
   * Clean up old sandboxes (older than maxAge milliseconds)
   */
  async cleanup(maxAge: number = 3600000): Promise<void> {
    const now = new Date();
    const toDelete: string[] = [];
    
    for (const [id, info] of this.sandboxes.entries()) {
      const age = now.getTime() - info.lastAccessed.getTime();
      if (age > maxAge) {
        toDelete.push(id);
      }
    }
    
    for (const id of toDelete) {
      await this.terminateSandbox(id);
    }
  }
}

// Export singleton instance
export const sandboxManager = new SandboxManager();

// Also maintain backward compatibility with global state
declare global {
  var sandboxManager: SandboxManager;
}

// Ensure the global reference points to our singleton
global.sandboxManager = sandboxManager;