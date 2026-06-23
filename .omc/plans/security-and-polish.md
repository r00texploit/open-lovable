# Plan: Security Hardening + UI/UX Polish + Local Testing

## Overview
Address critical security risks, polish the UI/UX, and ensure smooth local testing.

## Phase 1: Critical Security Fixes (Priority: 🔴 CRITICAL)

### 1.1 Complete Global State Migration
**Goal:** Migrate remaining 16 API routes from global state to session store

**Files to Update:**
- [ ] `app/api/create-ai-sandbox/route.ts` - `global.sandboxCreationInProgress`
- [ ] `app/api/create-ai-sandbox-v2/route.ts` - `global.activeSandbox`
- [ ] `app/api/apply-ai-code-stream/route.ts` - `global.existingFiles`, `global.sandboxState`
- [ ] `app/api/apply-ai-code/route.ts` - `global.existingFiles`
- [ ] `app/api/run-command/route.ts` - `global.activeSandbox`
- [ ] `app/api/run-command-v2/route.ts` - `global.activeSandbox`
- [ ] `app/api/get-sandbox-files/route.ts` - `global.activeSandbox`
- [ ] `app/api/kill-sandbox/route.ts` - `global.activeSandbox`
- [ ] `app/api/sandbox-status/route.ts` - `global.activeSandbox`
- [ ] `app/api/sandbox-logs/route.ts` - `global.activeSandbox`
- [ ] `app/api/monitor-vite-logs/route.ts` - `global.activeSandbox`
- [ ] `app/api/restart-vite/route.ts` - `global.activeSandbox`
- [ ] `app/api/install-packages/route.ts` - `global.activeSandboxProvider`
- [ ] `app/api/install-packages-v2/route.ts` - `global.activeSandboxProvider`
- [ ] `app/api/detect-and-install-packages/route.ts` - `global.activeSandboxProvider`
- [ ] `app/api/generate-ai-code-stream/route.ts` - `global.activeSandbox`

**Pattern for Each Route:**
1. Replace global state reads with `getSessionData()`
2. Replace global state writes with session store functions
3. Add `x-session-id` header requirement
4. Add ownership verification
5. Test the route

### 1.2 Frontend Session Header Integration
**Files:**
- [ ] `lib/api-client.ts` or create new API client
- [ ] Add session ID generation on app load
- [ ] Store session ID in localStorage
- [ ] Include `x-session-id` in all API requests

### 1.3 Sandbox Provider Session Adapter
**New File:** `lib/sandbox-session-adapter.ts`
- [ ] Create adapter to store sandbox instances in session
- [ ] Implement `getSandboxForSession()`
- [ ] Implement `setSandboxForSession()`
- [ ] Handle sandbox reconnection from session data

## Phase 2: Security Hardening (Priority: 🟠 HIGH)

### 2.1 Input Validation
**Files:**
- [ ] `lib/validations/` - Add stricter schemas
- [ ] All API routes - Add Zod validation
- [ ] Sanitize file paths (prevent directory traversal)

### 2.2 Rate Limiting
**New File:** `lib/rate-limiter.ts`
- [ ] Implement Upstash Redis rate limiter
- [ ] Apply to AI generation endpoints
- [ ] Apply to sandbox creation endpoints
- [ ] Different limits for free/paid users

### 2.3 Error Handling Improvements
**Files:**
- [ ] Create consistent error response format
- [ ] Add error codes for client handling
- [ ] Sanitize error messages (don't leak internal details)
- [ ] Add structured logging

### 2.4 Enable RLS Policies
**File:** `prisma/migrations/enable_rls.sql`
- [ ] Uncomment and customize RLS policies
- [ ] Test with multiple users
- [ ] Verify tenant isolation

## Phase 3: UI/UX Polish (Priority: 🟡 MEDIUM)

### 3.1 Builder Interface Improvements
**Files:**
- [ ] `app/builder/page.tsx` - Main layout
- [ ] `components/shared/chat/` - Chat interface
- [ ] `components/shared/code-editor/` - Code editor
- [ ] `components/shared/preview/` - Live preview

**Improvements:**
- [ ] Add loading skeletons for async operations
- [ ] Better empty states
- [ ] Improve resizable panels (smoother drag)
- [ ] Add keyboard shortcuts display
- [ ] Better error toast messages
- [ ] Add confirmation dialogs for destructive actions

### 3.2 Visual Polish
**Files:**
- [ ] `app/globals.css` - Consistent spacing
- [ ] `tailwind.config.ts` - Color consistency
- [ ] `components/ui/shadcn/` - Component styling

**Improvements:**
- [ ] Dark mode refinement
- [ ] Loading spinner consistency
- [ ] Button hover states
- [ ] Focus rings for accessibility
- [ ] Better mobile responsive design

### 3.3 Onboarding Experience
**Files:**
- [ ] `app/page.tsx` - Landing page
- [ ] `components/app/(home)/` - Home components
- [ ] New: `components/onboarding/`

**Improvements:**
- [ ] Add tooltips for first-time users
- [ ] Sample project templates
- [ ] Quick start guide
- [ ] Feature highlights

## Phase 4: Local Testing Setup (Priority: 🟢 ESSENTIAL)

### 4.1 Environment Validation
**Checklist:**
- [ ] `.env.local` has all required variables
- [ ] Database connection working
- [ ] Firecrawl API key valid
- [ ] AI provider API keys valid
- [ ] Sandbox provider configured

### 4.2 Database Setup
**Commands:**
- [ ] `npx prisma generate`
- [ ] `npx prisma migrate deploy`
- [ ] `npx prisma db seed` (if seed exists)
- [ ] Verify connection pooling

### 4.3 Sandbox Testing
**Test Scenarios:**
- [ ] Create new sandbox
- [ ] Generate code from prompt
- [ ] Apply code changes
- [ ] Install packages
- [ ] Restart Vite server
- [ ] View live preview
- [ ] Terminate sandbox

### 4.4 Full Workflow Testing
**User Journey:**
- [ ] Visit landing page
- [ ] Enter URL or prompt
- [ ] Wait for generation
- [ ] Chat with AI to make edits
- [ ] Preview changes
- [ ] Download/export project

### 4.5 Error Scenarios
**Test Cases:**
- [ ] Invalid API keys
- [ ] Database connection failure
- [ ] Sandbox timeout
- [ ] AI provider rate limit
- [ ] File system errors

## Phase 5: Performance Optimization (Priority: 🟡 MEDIUM)

### 5.1 Database Optimization
- [ ] Add missing indexes
- [ ] Optimize JSON queries
- [ ] Add query caching

### 5.2 Frontend Optimization
- [ ] Code splitting for builder page
- [ ] Lazy load Monaco editor
- [ ] Optimize images
- [ ] Add service worker for offline support

### 5.3 Bundle Size
- [ ] Analyze bundle with `@next/bundle-analyzer`
- [ ] Remove unused dependencies
- [ ] Tree-shake unused code

## Implementation Order

### Week 1: Security First
1. Complete global state migration (Days 1-3)
2. Frontend session headers (Day 4)
3. Basic rate limiting (Day 5)

### Week 2: Polish & Testing
1. UI/UX improvements (Days 1-3)
2. Local testing setup (Day 4)
3. Bug fixes from testing (Day 5)

## Success Criteria

### Security
- [ ] Zero `global.*` usage in API routes
- [ ] All routes require `x-session-id` header
- [ ] Session ownership verified on every request
- [ ] RLS policies active in production

### UI/UX
- [ ] Consistent loading states
- [ ] No layout shifts during loading
- [ ] Mobile-responsive builder
- [ ] Accessibility score > 90

### Testing
- [ ] Full workflow works locally
- [ ] All API endpoints tested
- [ ] Error handling verified
- [ ] Performance benchmarks met

## Risk Mitigation

### Migration Risks
- **Risk:** Breaking existing functionality
- **Mitigation:** Gradual rollout, feature flags, rollback plan

### Performance Risks
- **Risk:** Database queries slower than global state
- **Mitigation:** Add caching layer, optimize queries

### Testing Risks
- **Risk:** Missing edge cases
- **Mitigation:** Automated tests, manual QA checklist
