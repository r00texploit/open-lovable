# Fluid Compute Security Guide

## Overview

This document outlines security considerations when running Noeron on Vercel Fluid Compute.

## What Changed with Fluid Compute

**Before (Edge Functions):**
- Each request ran in complete isolation
- No state persisted between requests
- Higher cold start latency

**After (Fluid Compute):**
- Instances are reused across requests (up to 5 min idle)
- Module-level state persists between requests
- Lower latency, but **security risk of data leakage**

## Critical Security Issue: Module-Level State

### The Problem

In Fluid Compute, module-level variables persist across requests:

```typescript
// This Map persists across ALL requests hitting this instance!
const clientCache = new Map(); // In lib/ai/provider-manager.ts
```

### Current Global State (Security Risk)

| Global Variable | Purpose | Risk |
|----------------|---------|------|
| `global.activeSandbox` | Current sandbox instance | **HIGH** - Sandbox could leak to other sessions |
| `global.activeSandboxProvider` | Provider instance | **HIGH** - Could execute commands in wrong sandbox |
| `global.sandboxState` | File cache and metadata | **HIGH** - File cache contamination |
| `global.conversationState` | Chat context | **HIGH** - Conversation history exposure |
| `global.existingFiles` | Tracked file set | **MEDIUM** - Build artifact leakage |
| `global.viteErrors` | Error logging | **LOW** - Error message exposure |

## Mitigations Implemented

### 1. Database Connection Pooling

Uses `attachDatabasePool` to ensure database connections close before function suspension:

```typescript
// lib/db/prisma.ts
import { attachDatabasePool } from '@vercel/functions';
attachDatabasePool(pool);
```

### 2. Request Context Utilities

Created request-scoped context for isolation:

```typescript
// lib/request-context.ts
import { withRequestContext } from '@/lib/request-context';

export async function POST(request: NextRequest) {
  return withRequestContext(request, async () => {
    // Handler code with isolated context
  });
}
```

### 3. Security Guard

Added verification for sandbox access:

```typescript
// lib/security/fluid-compute-guard.ts
import { verifySandboxAccess } from '@/lib/security/fluid-compute-guard';

const check = verifySandboxAccess(sandboxId);
if (!check.allowed) {
  throw new Error(`Security violation: ${check.reason}`);
}
```

## Recommendations for Production

### Immediate Actions

1. **Add tenant/session headers** to all requests
2. **Clear global state** at the end of each request
3. **Validate sandbox ownership** before operations

### Long-term Refactoring

For true multi-tenant deployment, refactor to:

```typescript
// Instead of global.activeSandbox
// Use database-backed session storage

const session = await getSessionFromDatabase(sessionId);
const sandbox = await reconnectToSandbox(session.sandboxId);
```

### Row-Level Security (RLS)

If using PostgreSQL, enable RLS:

```sql
-- Enable RLS on all tables
ALTER TABLE "Site" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON "Site"
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Set tenant per request
SET LOCAL app.current_tenant = 'tenant-uuid';
```

## Testing Security

Run security audit:

```bash
# Check for global state usage
grep -rn "global\." app/api --include="*.ts"

# Check for module-level state
grep -rn "const .* = new Map\|const .* = new Set" lib --include="*.ts"
```

## Deployment Checklist

- [ ] Database connection pooling configured
- [ ] Fluid Compute enabled in `next.config.ts`
- [ ] Regional deployment configured in `vercel.json`
- [ ] Security utilities imported in critical API routes
- [ ] Module-level state audit completed
- [ ] RLS policies enabled (if using PostgreSQL)
- [ ] Session isolation tested

## Additional Resources

- [Vercel Fluid Compute Docs](https://vercel.com/docs/functions/fluid-compute)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Prisma Adapter Neon](https://www.prisma.io/docs/orm/overview/databases/neon)
