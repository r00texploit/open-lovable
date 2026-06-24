/**
 * Request-scoped context for Fluid Compute compatibility
 *
 * In Fluid Compute, module-level state persists across requests.
 * This utility provides request isolation via AsyncLocalStorage.
 *
 * @see https://vercel.com/docs/functions/fluid-compute
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  tenantId?: string;
  sessionId?: string;
  startTime: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Run code within a request-scoped context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Get current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
}

/**
 * Middleware wrapper for API routes to establish request context
 *
 * Usage:
 *   export async function POST(request: NextRequest) {
 *     return withRequestContext(request, async () => {
 *       // Your handler code here
 *     });
 *   }
 */
export async function withRequestContext<T>(
  request: Request,
  handler: () => Promise<T>
): Promise<T> {
  const context: RequestContext = {
    requestId: generateRequestId(),
    tenantId: request.headers.get('x-tenant-id') || undefined,
    sessionId: request.headers.get('x-session-id') || undefined,
    startTime: Date.now(),
  };

  return asyncLocalStorage.run(context, handler);
}

/**
 * Security helper: Clear all global state for current request
 * Call this at the end of request handling to prevent state leakage
 */
export function clearRequestGlobalState(): void {
  // Only clear if we're in a request context
  const context = getRequestContext();
  if (!context) return;

  // Clear tenant-specific globals (don't clear shared resources like AI clients)
  if (typeof global !== 'undefined') {
    // These should be per-session, not global
    // In multi-tenant mode, these would be stored in request context instead
    // @ts-ignore
    global.activeSandbox = undefined;
    // @ts-ignore
    global.sandboxState = undefined;
    // @ts-ignore
    global.conversationState = undefined;
    // @ts-ignore
    global.existingFiles = undefined;
    // @ts-ignore
    global.sandboxData = undefined;
  }
}
