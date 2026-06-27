# Plan: Fix Vercel Sandbox Errors for Stable Website Generation

**Source PRD**: User request via `/plan`
**Complexity**: Large
**Estimated Time**: 2-3 days

---

## Summary

This plan addresses the recurring Vercel Sandbox errors that cause 502 crashes, framer-motion import failures, and sandbox recreation loops. The goal is to make the sandbox system stable so users can create any website without encountering Vercel-specific errors.

Based on Vercel's official documentation and error analysis:
- [SANDBOX_NOT_LISTENING Error](https://vercel.com/docs/errors/sandbox_not_listening)
- [Vercel Sandbox System Specs](https://vercel.com/docs/sandbox/system-specifications)
- [Vercel Sandbox Concepts](https://vercel.com/docs/sandbox)

---

## Root Cause Analysis

### 1. Framer-Motion Import Errors
- **Problem**: AI generates code using `framer-motion` but the package isn't always properly installed or causes the dev server to crash
- **Impact**: High - breaks the entire preview
- **Current State**: Code uses `import { motion } from "framer-motion"` which fails if package not installed

### 2. SANDBOX_NOT_LISTENING (502 Errors)
- **Problem**: Vite dev server crashes or stops listening on port 3000
- **Causes**:
  - Package installation failures
  - Syntax errors in generated code
  - Missing dependencies
  - Dev server not restarting properly after package install
- **Impact**: Critical - sandbox becomes unreachable

### 3. Sandbox Recreation Loops
- **Problem**: When sandbox crashes, system recreates it but restores files with same problematic code
- **Impact**: Infinite loop of crash → recreate → crash

### 4. Package Installation Failures
- **Problem**: `npm install` times out or fails, especially with `framer-motion`
- **Impact**: Missing dependencies cause runtime errors

---

## Implementation Phases

### Phase 1: Code Generation Fixes (Day 1)
**Goal**: Prevent problematic code from being generated

#### Task 1.1: Create AI System Prompt Rules
- **File**: `lib/ai/code-generation-rules.ts` (NEW)
- **Action**: Create a rules file that gets injected into AI prompts
- **Rules**:
  - NO `framer-motion` - use CSS transitions only
  - NO external animation libraries - use Tailwind CSS
  - NO complex 3D libraries that need special installation
  - Use only `lucide-react` for icons (already installed)
  - Use standard React + Tailwind only

```typescript
export const CODE_GENERATION_RULES = `
CRITICAL RULES FOR CODE GENERATION:
1. NEVER use framer-motion or any animation libraries - use CSS/Tailwind only
2. NEVER use Three.js, R3F, or 3D libraries unless explicitly requested
3. Use only these pre-installed packages: react, react-dom, lucide-react
4. All animations must use Tailwind CSS classes (transition, animate, etc.)
5. Modal/drawer animations: use CSS transitions with opacity/transform
6. Hover effects: use Tailwind transition utilities
7. Page transitions: use CSS only, no libraries
`;
```

#### Task 1.2: Update AI Prompt Injection
- **File**: `app/api/generate-ai-code-stream/route.ts`
- **Action**: Inject rules into all AI code generation prompts
- **Mirror**: Current prompt construction pattern

#### Task 1.3: Create Package Validator
- **File**: `lib/ai/package-validator.ts` (NEW)
- **Action**: Parse AI response for package imports, validate against allowlist
- **Function**:
  - Extract import statements from generated code
  - Check against allowed packages
  - Reject or warn if disallowed packages detected

**Allowed Packages**:
```typescript
export const ALLOWED_PACKAGES = [
  'react',
  'react-dom',
  'lucide-react', // Only icon library allowed
  '@radix-ui/react-dialog', // For accessible modals
  '@radix-ui/react-dropdown-menu',
  // No framer-motion, no gsap, no three.js
];
```

---

### Phase 2: Package Installation Hardening (Day 1)
**Goal**: Make package installation more reliable

#### Task 2.1: Pre-install Common Packages
- **File**: `lib/sandbox/templates/vite-templates.ts`
- **Action**: Update templates to include common packages in devDependencies

Update `package.json` template:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    // ... existing
  }
}
```

#### Task 2.2: Add Package Installation Retry Logic
- **File**: `lib/sandbox/providers/vercel-provider.ts`
- **Action**: Update `installPackages()` method with retry logic

```typescript
async installPackages(packages: string[]): Promise<CommandResult> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.executeCommand('npm', ['install', ...packages]);
      if (result.exitCode === 0) {
        // Restart Vite after successful install
        await this.restartViteServer();
        return { success: true, ...result };
      }
      
      // If failed but not last attempt, wait before retry
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    } catch (error) {
      lastError = error as Error;
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Package installation failed after retries'
  };
}
```

#### Task 2.3: Add Health Check Before Restart
- **File**: `lib/sandbox/providers/vercel-provider.ts`
- **Action**: Verify dev server is actually listening before marking as ready

Add method:
```typescript
protected async verifyDevServerReady(): Promise<boolean> {
  const maxAttempts = 10;
  const delay = 1000;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await this.executeCommand(
        'curl', 
        ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://localhost:${appConfig.vercelSandbox.devPort}`]
      );
      if (result.stdout.trim() === '200') {
        return true;
      }
    } catch {
      // Not ready yet
    }
    await new Promise(r => setTimeout(r, delay));
  }
  
  return false;
}
```

---

### Phase 3: Sandbox Recovery & Error Handling (Day 2)
**Goal**: Gracefully handle sandbox crashes and prevent recreation loops

#### Task 3.1: Create Sandbox Health Monitor
- **File**: `lib/sandbox/health-monitor.ts` (NEW)
- **Action**: Monitor sandbox health and detect crashes early

```typescript
export class SandboxHealthMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private readonly maxFailures = 3;
  
  startMonitoring(provider: SandboxProvider) {
    this.checkInterval = setInterval(async () => {
      const isHealthy = await this.checkHealth(provider);
      if (!isHealthy) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxFailures) {
          await this.handleUnhealthySandbox(provider);
        }
      } else {
        this.consecutiveFailures = 0;
      }
    }, 10000); // Check every 10 seconds
  }
  
  private async checkHealth(provider: SandboxProvider): Promise<boolean> {
    try {
      const result = await provider.runCommand('curl -s http://localhost:3000 > /dev/null && echo "OK"');
      return result.stdout.includes('OK');
    } catch {
      return false;
    }
  }
  
  private async handleUnhealthySandbox(provider: SandboxProvider) {
    // Log the issue
    // Notify user
    // Attempt recovery or graceful restart
  }
}
```

#### Task 3.2: Update Sandbox Recreation Logic
- **File**: `lib/sandbox/sandbox-manager.ts`
- **Action**: Add circuit breaker pattern to prevent recreation loops

```typescript
export class SandboxManager {
  private recreationAttempts = new Map<string, number>();
  private readonly maxRecreationAttempts = 3;
  private readonly recreationWindowMs = 5 * 60 * 1000; // 5 minutes
  
  async recreateSandbox(sandboxId: string): Promise<boolean> {
    const attempts = this.getRecreationAttempts(sandboxId);
    
    if (attempts >= this.maxRecreationAttempts) {
      logger.error(`Sandbox ${sandboxId} has been recreated too many times`);
      return false; // Prevent recreation loop
    }
    
    this.incrementRecreationAttempts(sandboxId);
    // Proceed with recreation...
  }
}
```

#### Task 3.3: Create Code Sanitizer
- **File**: `lib/ai/code-sanitizer.ts` (NEW)
- **Action**: Sanitize AI-generated code before applying to sandbox

```typescript
export function sanitizeGeneratedCode(code: string): {
  sanitized: string;
  warnings: string[];
  blocked: boolean;
} {
  const warnings: string[] = [];
  
  // Check for framer-motion
  if (code.includes('framer-motion')) {
    warnings.push('framer-motion detected - must be removed');
    code = code.replace(/import.*framer-motion.*;?\n?/g, '');
    code = code.replace(/import {[^}]*} from ['"]framer-motion['"];?\n?/g, '');
  }
  
  // Check for other problematic patterns
  if (code.includes('eval(')) {
    warnings.push('eval() detected - security risk');
    blocked = true;
  }
  
  // Add more checks...
  
  return { sanitized: code, warnings, blocked };
}
```

---

### Phase 4: Port & Server Configuration Fixes (Day 2)
**Goal**: Ensure Vite always listens on the correct port

#### Task 4.1: Fix Vite Config Template
- **File**: `lib/sandbox/templates/vite-templates.ts`
- **Action**: Ensure strictPort is always true and host is correct

Current template already has this, but verify:
```typescript
server: {
  host: '0.0.0.0',  // Required for Vercel Sandbox
  port: 3000,
  strictPort: true,  // Fail if port not available
  // ...
}
```

#### Task 4.2: Add Dev Server Startup Verification
- **File**: `lib/sandbox/providers/vercel-provider.ts`
- **Action**: In `startViteServer()`, verify the server actually started

Update existing method:
```typescript
protected async startViteServer(): Promise<void> {
  await this.killViteProcess();
  
  await this.executeCommand(
    'sh',
    ['-c', 'nohup npm run dev > /tmp/vite.log 2>&1 &'],
    this.workingDirectory
  );
  
  // Wait initial delay
  await new Promise(resolve => setTimeout(resolve, appConfig.vercelSandbox.devServerStartupDelay));
  
  // NEW: Verify server is actually listening
  const isReady = await this.verifyDevServerReady();
  if (!isReady) {
    throw new Error('Vite dev server failed to start - check /tmp/vite.log');
  }
  
  this.logger.info('Vite server verified listening on port 3000');
}
```

---

### Phase 5: Error Reporting & User Feedback (Day 3)
**Goal**: Better error messages and recovery suggestions

#### Task 5.1: Create Error Classification System
- **File**: `lib/errors/sandbox-errors.ts` (NEW)
- **Action**: Map Vercel errors to user-friendly messages

```typescript
export const SANDBOX_ERROR_MESSAGES = {
  SANDBOX_NOT_LISTENING: {
    title: 'Preview temporarily unavailable',
    message: 'The development server stopped. Creating a new sandbox...',
    action: 'auto-retry'
  },
  FRAMER_MOTION_ERROR: {
    title: 'Animation library not supported',
    message: 'This code uses framer-motion which can cause stability issues. Using CSS animations instead.',
    action: 'code-fix'
  },
  PACKAGE_INSTALL_FAILED: {
    title: 'Package installation failed',
    message: 'Could not install required packages. Retrying with alternative method...',
    action: 'retry'
  },
  // More mappings...
};
```

#### Task 5.2: Update UI Error Display
- **File**: `components/SandboxPreview.tsx` or similar
- **Action**: Show actionable error messages to users

---

## Files to Change

| File | Action | Why |
|------|--------|-----|
| `lib/ai/code-generation-rules.ts` | CREATE | Inject rules to prevent framer-motion |
| `lib/ai/package-validator.ts` | CREATE | Validate packages before installation |
| `lib/ai/code-sanitizer.ts` | CREATE | Sanitize AI output before applying |
| `lib/sandbox/health-monitor.ts` | CREATE | Monitor sandbox health |
| `lib/errors/sandbox-errors.ts` | CREATE | Error classification and messages |
| `app/api/generate-ai-code-stream/route.ts` | UPDATE | Inject rules into AI prompts |
| `lib/sandbox/providers/vercel-provider.ts` | UPDATE | Add retry logic and health checks |
| `lib/sandbox/templates/vite-templates.ts` | UPDATE | Pre-install lucide-react |
| `lib/sandbox/sandbox-manager.ts` | UPDATE | Circuit breaker for recreation |
| `config/app.config.ts` | UPDATE | Add new config options |

---

## Validation

### Test Cases

```bash
# Test 1: Framer-motion prevention
echo "Test: Generate code with framer-motion request"
# Should reject or sanitize the code automatically

# Test 2: Package installation with retry
echo "Test: Install packages with flaky network"
# Should retry and succeed

# Test 3: Sandbox crash recovery
echo "Test: Kill vite process mid-session"
# Should detect crash and recreate gracefully

# Test 4: Port binding verification
echo "Test: Start vite server"
# Should verify port 3000 is actually listening
```

### Validation Commands

```bash
# Verify templates
npm run build

# Test sandbox creation
npm run test:sandbox

# Check for framer-motion in codebase
grep -r "framer-motion" app/ --include="*.ts" --include="*.tsx"
# Should return no results
```

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AI still generates framer-motion | High | Use regex to strip imports, fallback to CSS |
| Package install still fails | Medium | Retry 3x with exponential backoff |
| Sandbox recreation loop | Medium | Circuit breaker limits to 3 attempts |
| Vite fails to bind to port | Low | strictPort: true, verify with curl |
| User wants animations | Medium | Document CSS alternatives in UI |

---

## Acceptance Criteria

- [ ] No framer-motion imports in any generated code
- [ ] Package installation has 3-retry logic with success tracking
- [ ] Vite startup verifies port binding before returning success
- [ ] Sandbox recreation limited to 3 attempts per 5-minute window
- [ ] All sandbox errors have user-friendly messages
- [ ] Health monitor detects crashes within 30 seconds
- [ ] lucide-react pre-installed in all new sandboxes

---

## WAITING FOR CONFIRMATION

**Proceed with this plan?**

Reply with:
- `yes` or `proceed` to start implementation
- `modify: [your changes]` to adjust the plan
- `focus on: [phase name]` to implement only specific phase
- `skip: [task]` to skip a specific task