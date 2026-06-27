# Plan: Noeron UI / Design Tokens / Layout Review & Remediation

**Source PRD / context**: Current landing page (`app/page.tsx`) and saas-landing components after recent UI improvement pass and Tailwind spacing fix.
**Selected Milestone**: Remediate the top visual, architecture, and accessibility gaps found in the current build.
**Complexity**: Medium

## Summary

The Noeron landing page has moved from a generic template look to a more intentional dark-orange brand direction, but several gaps remain after the recent fixes: two competing styling systems (new CSS utility classes vs. legacy Fire/OL system) create inconsistency, iconography and interactive affordances still need polish, and a number of accessibility details (focus states, semantic markup, motion) are incomplete. This plan consolidates the findings into three workstreams — visual design, frontend architecture, and accessibility — with concrete, prioritized tasks.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Naming | `app/globals.css` | Custom utilities use kebab-case semantic names: `.btn-primary`, `.card-elevated`, `.section-lg`, `.text-headline`. |
| Error handling | `components/saas-landing/pricing-section.tsx:63-82` | Stripe checkout wraps fetch, surfaces error to console, sets loading state. |
| Component composition | `app/page.tsx:85-86` | Server page delegates interactive pieces to client components (`MobileNav`). |
| Styling tokens | `app/globals.css:6-44` | CSS custom properties for spacing, shadows, brand colors; Tailwind reads them via `var()`. |
| Accessibility | `app/page.tsx:23-34` | Skip link and focus-visible ring are already in place. |

## Files to Change

| File | Action | Why |
|---|---|---|
| `tailwind.config.ts` | UPDATE | Restore default Tailwind spacing scale so `w-*`, `h-*`, `gap-*`, `p-*` resolve correctly. |
| `app/globals.css` | UPDATE | Consolidate token layers; remove or namespace conflicting Fire/OL classes; add missing motion tokens. |
| `styles/main.css` and `styles/components/*.css` | REVIEW / REFACTOR | Legacy Fire design system duplicates/overrides new globals; decide migration path. |
| `components/saas-landing/hero.tsx` | UPDATE | Fix "Watch demo" affordance, icon sizing, semantic markup, reduced-motion. |
| `components/saas-landing/features.tsx` | UPDATE | Standardize icon containers, improve bento composition, add missing motion preference. |
| `components/saas-landing/how-it-works.tsx` | UPDATE | Same icon/padding/motion fixes; consider connector readability. |
| `components/saas-landing/pricing-section.tsx` | UPDATE | Accessible billing toggle, loading/error UX, card hover consistency. |
| `components/saas-landing/faq.tsx` | UPDATE | Already has `aria-expanded`; add focus-visible styles and reduced-motion. |
| `components/saas-landing/cta.tsx` | UPDATE | Inconsistent heading size (`text-display`), inline SVG icon, CTA duplication with hero. |
| `components/saas-landing/footer.tsx` | UPDATE | Social icons too small, link hover uses layout-shifting transform. |
| `components/ui/button.tsx` | UPDATE | Shadcn `Button` is orphaned; reconcile with `.btn-primary`/`.btn-secondary`. |
| `components/ui/abstract-shapes.tsx` | UPDATE | Add `prefers-reduced-motion` and ensure they do not receive focus. |
| `app/landing.tsx` | REVIEW / DELETE? | Dead legacy landing page with broken imports; likely stale and should be removed or archived. |
| `app/layout.tsx` | UPDATE | Font preloading, metadata manifest 404, theme handling. |
| `components/mobile-nav.tsx` | UPDATE | Add reduced-motion support, trap focus when open, close on outside click / Escape. |

## Tasks

### Task 1: Stabilize design tokens and Tailwind config
- **Action**: Remove the pixel-only `sizes` override from `spacing` in `tailwind.config.ts` and merge `defaultTheme.spacing`. Keep custom pixel utilities for one-off layout helpers (`cw`, `cmw`, etc.) under their own keys.
- **Mirror**: Tailwind’s default `spacing` scale is the source of truth; project tokens live in CSS custom properties.
- **Validate**: `npx tsc --noEmit` passes; `npm run build` passes; Playwright measures `w-4 h-4` icons at 16px, `gap-6` at 24px.

### Task 2: Reconcile the two styling systems
- **Action**: Audit `styles/main.css`, `styles/components/index.css`, and `styles/fire.css`. Either (a) remove the legacy Fire/OL classes that are unused on the new landing pages, or (b) namespace them (e.g., `.fire-button`, `.ol-shell`) so they do not collide with `.btn-primary`/`.card-elevated`. Remove the global `input[type="text"]:focus` style override that strips focus rings.
- **Mirror**: Single source of truth per concern; avoid competing global styles.
- **Validate**: No unexpected style regressions on `/`, `/pricing`, `/auth/signin`; Lighthouse "Avoid non-composited animations" and CLS scores stable.

### Task 3: Standardize iconography and interactive affordances
- **Action**: Bump section badges to `w-5 h-5`, footer social icons to `w-5 h-5`, feature/step icons to `w-7 h-7` inside `w-14 h-14` containers. Replace inline checkmark SVGs with `lucide-react` `Check` or `CheckCircle2`. Ensure every icon-only control has an `aria-label`.
- **Mirror**: Consistent icon sizing via Tailwind utilities; no inline SVGs for repeated iconography.
- **Validate**: Visual regression screenshot comparison shows no tiny icons; all buttons have accessible names.

### Task 4: Fix layout spacing and section rhythm
- **Action**: Replace hardcoded `mb-16`, `mt-16`, `gap-6` with token-based spacing where possible. Add `padding-top` offset for anchored sections so the fixed header does not cover headings. Verify `section-lg` values feel intentional at 1440px, 1024px, 768px, 375px.
- **Mirror**: CSS custom properties `--section-sm/md/lg` and `.section-*` utilities.
- **Validate**: Full-page Playwright screenshots show consistent vertical rhythm; no horizontal overflow on mobile.

### Task 5: Improve accessibility and motion
- **Action**: Add `aria-controls`/`aria-expanded` to any remaining accordions; ensure mobile menu traps focus and closes on Escape; add `prefers-reduced-motion` wrappers around Framer Motion entrance animations and the gradient orbs; verify color-contrast ratios for `text-white/40`, `text-white/60` on `#0A0A0B`.
- **Mirror**: Existing skip link and focus-visible ring in `app/globals.css:49-57`.
- **Validate**: Keyboard-only navigation works for menu, pricing toggle, FAQ, CTAs; axe-core or Playwright a11y scan returns 0 critical/serious violations.

### Task 6: Clean up dead code
- **Action**: Delete or archive `app/landing.tsx` and its broken imports if it is not part of the active product. Verify no references remain.
- **Mirror**: YAGNI — remove unused surfaces.
- **Validate**: `npm run build` passes; no broken import errors.

## Validation

```bash
# Type check
npx tsc --noEmit --incremental --tsBuildInfoFile node_modules/.cache/tsc-plan.tsbuildinfo

# Production build
npm run build

# Start dev server for Playwright verification
npm run dev

# In another shell / via Playwright MCP:
# 1. Open http://localhost:3000 at 1440x900, 1024x768, 768x1024, 375x812
# 2. Capture full-page screenshots for visual regression
# 3. Tab through: skip link → nav → hero CTAs → preview input → features → pricing toggle → FAQ → footer
# 4. Open/close mobile menu; verify aria-expanded and focus trap
# 5. Run Lighthouse or axe-core scan for a11y
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tailwind spacing fix re-introduces layout breakage elsewhere in the app that relied on pixel values | Medium | Merge `defaultTheme.spacing` while keeping the custom `sizes` map for explicit pixel utilities; test `/`, `/pricing`, `/auth/signin`, `/generation`, `/sites`. |
| Removing Fire/OL legacy styles breaks existing app pages that still use them | High | Do not delete them wholesale; namespace or scope them to specific pages/components first, then deprecate. |
| Framer Motion reduced-motion changes suppress hero entrance animations entirely | Low | Use `useReducedMotion()` and keep a static fallback state; verify the page is still usable. |
| Footer social icon resize causes wrap/overflow on very small screens | Low | Use `flex-wrap` and test at 320px. |

## Acceptance

- [ ] Tailwind spacing scale restored; standard utilities resolve to expected rem values.
- [ ] No conflicting global styles between Fire/OL and new design tokens on active pages.
- [ ] Icons have consistent, readable sizes and all icon-only controls have accessible names.
- [ ] Section spacing is rhythmic and responsive across all tested breakpoints.
- [ ] Keyboard navigation works for menu, pricing toggle, FAQ, and CTAs.
- [ ] `prefers-reduced-motion` respected for motion-heavy sections.
- [ ] `npm run build` passes and Playwright screenshots show no visual regressions.
- [ ] Dead `app/landing.tsx` removed or clearly documented as intentionally retained.

---

**WAITING FOR CONFIRMATION**: Proceed with this plan? (yes / no / modify)
