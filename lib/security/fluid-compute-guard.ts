/**
 * Fluid Compute Security Guard
 *
 * Protects against data leakage in Vercel Fluid Compute environment
 * where module-level state persists across requests.
 *
 * CRITICAL: This app currently uses global state for session management.
 * In a true multi-tenant deployment, this MUST be refactored to use:
 * - Database-backed session storage
 * - Request-scoped context (AsyncLocalStorage)
 * - Tenant isolation in all data access
 */

import { getRequestContext } from '@/lib/request-context';

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Verify the operation is allowed for the current request context
 * Prevents cross-tenant data access in Fluid Compute
 */
export function verifySandboxAccess(sandboxId: string): SecurityCheckResult {
  const context = getRequestContext();

  // If no request context, we're not in Fluid Compute or context wasn't set
  if (!context) {
    return { allowed: true }; // Allow for backward compatibility
  }

  // In multi-tenant mode, verify tenant owns this sandbox
  if (context.sessionId && context.sessionId !== sandboxId) {
    // Log security event
    console.error(`[SECURITY] Cross-session access attempt: ${context.requestId}`, {
      attemptSession: sandboxId,
      currentSession: context.sessionId,
    });

    return {
      allowed: false,
      reason: 'Sandbox does not belong to current session',
    };
  }

  return { allowed: true };
}

/**
 * Wraps a handler with security checks for Fluid Compute
 */
export function withSecurityCheck<T extends (...args: any[]) => any>(
  resourceIdExtractor: (...args: Parameters<T>) => string,
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const resourceId = resourceIdExtractor(...args);
    const check = verifySandboxAccess(resourceId);

    if (!check.allowed) {
      throw new Error(`Security violation: ${check.reason}`);
    }

    return handler(...args);
  }) as T;
}

/**
 * Audit log for security events
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>
): void {
  const context = getRequestContext();

  console.log('[SECURITY_AUDIT]', {
    event,
    requestId: context?.requestId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Validate that critical globals are properly isolated
 * Call this in development to catch issues early
 */
export function validateIsolation(): void {
  if (process.env.NODE_ENV === 'production') {
    // In production, warn about global state usage
    const globals = [
      'activeSandbox',
      'sandboxState',
      'conversationState',
      'existingFiles',
    ];

    for (const key of globals) {
      if ((global as any)[key] !== undefined) {
        console.warn(`[SECURITY] Global state detected: ${key}. Ensure proper isolation in Fluid Compute.`);
      }
    }
  }
}
