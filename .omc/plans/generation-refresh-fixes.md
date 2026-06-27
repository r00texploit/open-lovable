# Generation Refresh & Reliability Fixes

## Goal
Fix the five issues discovered during the Playwright generation test so generated code survives refresh, downloads work, and the AI stops producing invalid icon imports.

## Issues
1. **Generated code disappears after refresh** — `generationProgress.files`, `conversationContext.lastGeneratedCode`, and URL/prompt context are not persisted.
2. **Sidebar URL submission uses stale state** — `SidebarInput` calls `setHomeUrlInput(url); startGeneration();`, but `startGeneration` reads `homeUrlInput` before React has flushed the update.
3. **Download ZIP says "No files to download yet"** — `sandboxFiles` is empty after code apply, and the fallback to `/api/get-sandbox-files` returns "No active sandbox" because the backend sandbox provider is not set.
4. **Generated preview crashes on invalid `lucide-react` imports** — the AI imported `Facebook`, which is not a valid export, causing a Vite runtime error.
5. **Refresh auto-restarts a new generation** — leftover `sessionStorage.targetUrl` / `autoStart` from the Sidebar/home page triggers `startGeneration` again on mount.

## Implementation Strategy

### 1. Persist generated code across refresh
- Extend `saveSession` in `app/generation/page.tsx` to include:
  - `generationProgress.files`
  - `conversationContext.lastGeneratedCode`
  - `homeUrlInput` / `homeContextInput`
- Update `app/api/generation-session/route.ts` to accept and store:
  - `fileCache` (mapped from generated files)
  - `conversationCtx` (already stored, but ensure `lastGeneratedCode` is included)
- On mount restore (`useEffect` around line 274):
  - If a saved session exists, restore `generationProgress.files` and `conversationContext.lastGeneratedCode`.
  - Restore `homeUrlInput` / `homeContextInput` so the chat context is preserved.
- Update the `GenerationSession` Prisma usage only (schema already has `fileCache` and `conversationCtx` JSON columns); no migration needed.

### 2. Fix SidebarInput race condition
- Refactor `startGeneration` to accept an optional options object:
  - `{ url?: string; context?: string; fromHome?: boolean }`
- Use the passed `url` / `context` directly instead of reading `homeUrlInput` / `homeContextInput` state for the initial clone flow.
- Update `handleHomeScreenSubmit` and `SidebarInput.onSubmit` to pass the values directly.
- Keep `homeUrlInput` / `homeContextInput` state updates for display purposes only.

### 3. Make Download ZIP reliable
- In `downloadZip`:
  - If `Object.keys(sandboxFiles).length === 0`, call `/api/get-sandbox-files` and use the returned files.
  - If that also returns empty, show a clear message.
- In `applyGeneratedCode` / `fetchSandboxFiles`:
  - After successful apply, call `fetchSandboxFiles()` and store the result in `sandboxFiles` state so the ZIP is immediately available.
- Investigate backend sandbox provider state: `/api/get-sandbox-files` relies on `global.activeSandbox` which is not being set by `create-ai-sandbox-v2`. Update `create-ai-sandbox-v2` or `sandboxManager` to set `global.activeSandbox` so the API can read files.

### 4. Prevent invalid `lucide-react` imports
- Add a small utility `/lib/ai/sanitize-lucide-imports.ts`:
  - Maintain a list of valid named exports from `lucide-react` (common set).
  - For each generated file, replace `import { ... } from 'lucide-react'` with only valid exports.
  - If all named imports are invalid, replace the import with a generic `Circle` or remove it and replace JSX usages with `<span>` placeholders.
- Call this utility in `apply-ai-code-stream` on every parsed file before writing to the sandbox.
- Also add a rule in the `generate-ai-code-stream` system prompt telling the AI to only use well-known Lucide icons and never invent icon names.

### 5. Clean up `sessionStorage` auto-start
- In the mount restore `useEffect` in `app/generation/page.tsx`:
  - After reading `targetUrl` / `autoStart` / `selectedStyle` / `additionalInstructions`, immediately remove them so they don't trigger again on refresh.
- In `startGeneration`:
  - Remove `autoStart` / `targetUrl` / `selectedStyle` at the start of the function.
- In `handleHomeScreenSubmit` and `SidebarInput.onSubmit`:
  - Remove `autoStart` immediately after reading it, or rely on the cleanup inside `startGeneration`.

## Files to Modify
- `app/generation/page.tsx` (persistence, race fix, sessionStorage cleanup, ZIP fallback)
- `app/api/generation-session/route.ts` (accept `fileCache` and conversation context)
- `app/api/apply-ai-code-stream/route.ts` (sanitize lucide imports, fetch files after apply)
- `app/api/create-ai-sandbox-v2/route.ts` (set `global.activeSandbox` or ensure `sandboxManager` does)
- `lib/ai/sanitize-lucide-imports.ts` (new utility)
- `app/api/generate-ai-code-stream/route.ts` (add lucide icon rule to system prompt)

## Verification
- `pnpm tsc --noEmit`
- `pnpm build`
- Playwright: generate a landing page, download ZIP, refresh page, confirm Code tab still shows generated files and preview reloads.

## Risks
- `app/generation/page.tsx` is 4.6k lines; edits must be precise to avoid breaking existing state.
- Backend `global.activeSandbox` state may be managed elsewhere; verify before changing.
- Mitigation: keep edits minimal, preserve existing function signatures with optional parameters, and test each change.
