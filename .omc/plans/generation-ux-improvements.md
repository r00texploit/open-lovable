# Generation Page UX Improvements Plan

## 1. Token / Usage Visibility
**Problem:** Users cannot see how many tokens they have left while on the generation page. The existing `UsageIndicator` component is outdated (dark gray theme) and not used on this page. The `UsageBar` component exists but is not integrated.

**Solution:**
- Reuse the existing `UsageBar` component (`components/subscription/usage-bar.tsx`) with `variant="compact"` and `size="sm"`.
- Place it in the **top header bar** of the generation page, between the AI model selector and the toolbar buttons.
- Fetch usage data via `/api/usage` on mount.
- Add an inline "Upgrade" link (reusing `ManageSubscriptionButton` logic) that appears only when the user is on the free tier or near their limit (`> 80%`).
- Style it to match the existing warm color palette (`bg-warm-025`, `border-warm-750/12`).

**Files to change:**
- `app/generation/page.tsx` — add usage fetch state, render `UsageBar` in header.

**No new dependencies needed.**

---

## 2. Sandbox Circular Loading Indicator
**Problem:** The preview tab loading overlay uses only skeleton lines and text. Users don't get a clear "spinning" sense that the sandbox is actively being prepared.

**Solution:**
- Add a **circular SVG spinner** (rotating ring) to the center of the preview loading overlay in `renderMainContent()`.
- Keep the skeleton lines as secondary ambient animation below the spinner.
- Update status text to be stage-aware:
  - Sandbox creation → "Creating sandbox..."
  - URL probing → "Warming up sandbox..."
  - Vite starting → "Starting dev server..."
- The spinner disappears as soon as `sandboxData.url` is available and the iframe loads.

**Files to change:**
- `app/generation/page.tsx` — enhance the `shouldShowLoadingOverlay` block in the preview tab.

**No new dependencies needed.**

---

## 3. Chat Message Clutter Cleanup
**Problem:** The chat is flooded with `type: 'system'` operational messages ("Creating sandbox...", "Waiting for sandbox to be ready...", "Scraping website content...", etc.), burying actual AI responses (`type: 'ai'`).

**Solution:**
- **Make system messages visually compact:** Reduce padding (`px-3 py-1.5` instead of `px-4 py-3`), smaller font (`text-xs`), muted background (`bg-warm-100/50`), no border, and left-aligned with a subtle dot indicator.
- **Remove redundant system messages** that duplicate UI state already shown elsewhere:
  - "Waiting for sandbox to be ready..." — already shown by the loading overlay.
  - "Creating sandbox while I plan your app..." — already shown by the header status badge.
  - "Scraping website content..." / "Using cached content..." — already shown by the loading overlay.
  - "Building your component..." — already shown by generation progress.
- **Keep only high-value system messages:** errors, success confirmations ("Applied X files"), and tips.
- **Add a "System Activity" collapsible toggle** at the top of the chat area so operational messages can be viewed if needed, but are hidden by default.

**Files to change:**
- `app/generation/page.tsx` — refactor chat message rendering; update `addChatMessage` calls to skip transient operational messages.

**No new dependencies needed.**

---

## Verification Steps
1. Build the app (`npm run build` or `next build`) to ensure no TypeScript errors.
2. Check the generation page header shows the compact usage bar.
3. Start a new generation and confirm the circular spinner appears in the preview overlay.
4. Confirm system messages in chat are compact and that redundant operational messages are gone.
5. Check responsive layout on mobile and desktop widths.

## Scope
- Only `app/generation/page.tsx` and potentially minor adjustments to `components/subscription/usage-bar.tsx` if sizing tweaks are needed.
- No backend changes (usage API already exists).
- No new npm packages.
