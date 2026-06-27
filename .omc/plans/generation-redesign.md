# Generation Page Redesign Plan

## Goal
Redesign `app/generation/page.tsx` so it matches the professional, polished look of the landing, pricing, auth, and settings pages while preserving all existing functionality.

## Current Problems
1. Misplaced dark "Welcome!" card clips outside the chat panel.
2. Two competing inputs: the `SidebarInput` URL form and the `HeroInput` chat input, both with different styling.
3. Top icon bar is a row of mismatched icon-only buttons with tooltips.
4. Site-creation row looks like a dropped-in mini-form rather than part of the header.
5. Empty/preview states are minimal and inconsistent with the rest of the product.
6. Mix of hardcoded dark colors (`gray-900`, `black`, `purple-600`) inside the light app shell.

## Design Direction
Use the same warm palette and spacing scale as the landing/auth pages:
- Background: `--background-lighter` / `--background-base` / `--warm-025`
- Surfaces: white or `warm-025` with subtle `border-muted`
- Text: `foreground`, `foreground-dimmer`, `warm-500`
- Primary actions: `ol-primary-button` / `btn-primary`
- Secondary actions: warm outline buttons with hover fill
- Radius: `radius-xl` (24px) for cards, `radius-lg` (16px) for inputs
- Elevation: `shadow-2`/`shadow-3` sparingly on floating elements

## Proposed Layout

### Header bar (single row)
- Left: Noeron logo (home link), model selector, status badge.
- Right: cohesive icon button group with text labels on desktop (icon-only on mobile) for New sandbox, Re-apply, Download, Sites, Settings, Sign out.
- Replace the second site-management bar with a clean header section inside the main workspace.

### Site header (below main header)
- Left: site selector + published/draft badge + copy URL / preview links.
- Right: compact inline site creation form or publish/unpublish actions.
- Keep the current logic but restyle using the warm token system.

### Workspace (below site header)
Three-column layout on desktop:
1. **Left sidebar (chat):** 380px max, resizable on drag (optional), containing:
   - A single unified input that supports both URL/prompt entry (merge SidebarInput + HeroInput flows).
   - Chat message list with consistent message bubbles (AI warm/white, user dark-warm).
   - Welcome message as a proper assistant message bubble, not a floating dark card.
2. **Center preview:** flexible width, tab switcher (Code / View), iframe preview with empty state and loading state.
3. **Right code explorer (optional / collapsible):** show when Code tab is active or during generation; file tree with warm folder/file styling.

### Empty state
When no sandbox exists:
- Show a centered card in the preview area:
  - Icon: lightning bolt or globe in a warm muted circle
  - Heading: "Start building"
  - Subtext: "Paste a URL or describe what you want to create"
  - Primary CTA: "Generate from URL" / "Start from prompt"

### Loading/preview states
- Replace raw 502 iframe error with a friendly error card + retry button.
- Keep package-installation overlay but restyle with warm tokens.

## Implementation Strategy
1. **Refactor header** into a new `GenerationHeader` component inline or in a new file.
2. **Refactor site controls** into a new `SiteHeader` component.
3. **Refactor chat panel**:
   - Move the welcome message into the chat list as the first message.
   - Replace `SidebarInput` with an inline compact URL form inside the chat panel.
   - Keep `HeroInput` at the bottom for chat messages.
4. **Refactor preview area**:
   - Add proper empty state card.
   - Add error state card for sandbox failures.
   - Restyle loading overlays.
5. **Refactor code explorer**:
   - Restyle file tree with warm folder colors (`warm-600` for active, `warm-500` for files).
   - Use consistent SyntaxHighlighter wrapper.
6. **Global consistency**:
   - Replace remaining hardcoded dark colors in generation page with tokens.
   - Ensure `prefers-reduced-motion` respected.

## Files to Modify
- `app/generation/page.tsx` (main refactor)
- `components/app/generation/SidebarInput.tsx` (restyle inline URL form)
- `components/app/generation/BrandSelect.tsx` (already tokenized — minor spacing tweaks)
- `styles/main.css` (add any missing utility classes)

## Verification
- `pnpm tsc --noEmit`
- `pnpm build`
- Playwright screenshots on desktop + mobile
- Sign in with test user and check `/generation`

## Risks
- File is 4565 lines; large refactor may introduce regressions.
- Mitigation: keep function names and state hooks unchanged; only restyle/restructure JSX.
- Avoid touching data fetching/generation logic.
