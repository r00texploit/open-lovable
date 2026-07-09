---
name: noeron-a11y-patterns
description: Recurring accessibility anti-patterns found in the Noeron codebase during landing page and auth flow audits.
metadata:
  type: project
---

Recurring accessibility issues to check on every Noeron UI change:

- **Viewport zoom lock** — `app/layout.tsx` sets `maximumScale: 1` on the viewport, which blocks pinch-zoom and fails WCAG 1.4.4/1.4.10. Remove it or set `maximumScale` to at least 5.
- **Text input focus suppression** — `styles/main.css` lines 414-419 strips `outline` and `box-shadow` from all `input[type="text"]:focus` inputs. This breaks WCAG 2.4.7 for the hero preview input and any future text fields using that selector. Replace with a designed focus ring.
- **Form labels not programmatically associated** — Auth pages (`app/auth/signin/page.tsx`, `app/auth/signup/signup-content.tsx`, `app/auth/forgot-password/page.tsx`) use `<label>` as siblings to `<input>` without `htmlFor`/`id`, and inputs have no `id`. Screen readers may not announce the label; click-to-focus fails. Always pair `label htmlFor` with `input id`.
- **Custom terms "checkbox" implemented as `<button type="button">`** — `app/auth/signup/signup-content.tsx` uses a button with a visual check state but no `role="checkbox"`, `aria-checked`, or native `<input type="checkbox">`. Screen readers do not announce it as a checkbox. Convert to a real checkbox or add `role="checkbox"` + `aria-checked`.
- **Icon-only links without accessible names** — `components/saas-landing/footer.tsx` social links contain only SVG icons. Add `aria-label` on each `<a>` or visually hidden text.
- **Redundant `role="navigation"` on `<nav>`** — `app/page.tsx` and `components/mobile-nav.tsx` both add `role="navigation"` to native `<nav>` elements. Remove the redundant role.
- **Missing `aria-controls` on toggles/accordions** — Pricing billing toggle and FAQ accordion use `aria-pressed`/`aria-expanded` but do not link buttons to their controlled regions with `aria-controls`.
- **Inconsistent reduced-motion support** — Only `components/saas-landing/features.tsx` uses `useReducedMotion()`. Other Framer Motion sections (hero, pricing, FAQ, CTA, auth) animate regardless of `prefers-reduced-motion`. The CSS `@media (prefers-reduced-motion: reduce)` rule only affects CSS transitions/animations, not JS-driven Framer Motion.
- **Nested interactive controls** — Pricing free-tier card wraps a `<button>` inside an `<a>` (`components/saas-landing/pricing-section.tsx`), producing duplicate tab stops and confusing screen-reader output. Render a single interactive element.
- **Password reveal button removed from tab order** — `components/auth/password-input.tsx` sets `tabIndex={-1}` on the show/hide password toggle, making it unreachable by keyboard. Keep it in the tab order.

## Admin surface (app/admin/**, components/admin/**)

- **`text-heat-100` on `bg-heat-8` fails WCAG AA** — heat-100 (#fa5d19) on heat-8-over-background ≈ 2.8:1. Used for active nav items, active filter pills, the "Admin" badge, and "creating" sandbox status. All are normal-size text (12-14px), so AA 4.5:1 applies and fails. Fix: use a darker heat token (≈ #c83d0a passes AA) or `text-foreground` for active labels, keeping `bg-heat-8` as the indicator.
- **Fire design-system tokens have NO dark-mode overrides** — `styles/design-system/colors.css` defines heat-*, background-*, foreground-dimmer, border-* only in `:root`. `styles/main.css` `.dark` only overrides shadcn HSL tokens. The admin surface is therefore light-only; if a user is in dark mode, admin stays light (jarring but functional). Confirm intentional or add dark overrides / clamp admin to light.
- **Segmented filter controls convey state by color only** — `components/admin/sites-filter.tsx` and `sandboxes-filter.tsx` use buttons with no `aria-pressed`/`aria-current`; active state is only `bg-heat-8 text-heat-100`. Add `aria-pressed={active===value}` and wrap in `role="group" aria-label`.
- **ConfirmAction dialog trigger missing `aria-haspopup`/`aria-expanded`** — `components/admin/confirm-action.tsx` renders a raw button with controlled `open` state inside `<Dialog>` instead of using `<DialogTrigger asChild>`. Radix auto-wires those attrs only with DialogTrigger. Focus trap/restore still works via DialogContent. Fix: use DialogTrigger asChild, or add `aria-haspopup="dialog" aria-expanded={open}` to the trigger.
- **Destructive confirm uses primary (orange) button, not a red destructive variant** — `confirm-action.tsx` maps `destructive ? "btn-primary" : "btn-secondary-light-light"`. Destructive confirms (Delete/Kill/Unpublish) should be red, not brand-orange, to signal danger.
- **AdminTable missing `scope="col"` and table labels** — `components/admin/admin-table.tsx` `<th>` has no `scope`. Tables on the user detail page (Sites, Sessions) have no `<caption>`/`aria-labelledby` to distinguish them.
- **Focus indicator on form inputs is low-contrast** — `components/admin/search-input.tsx` and `user-actions.tsx` use `focus:outline-none` + `focus:ring-1 focus:ring-heat-40` (40% opacity orange, ~1px). Likely fails WCAG 1.4.11 non-text contrast (3:1). Increase ring width/opacity.

**Why:** These issues show up repeatedly across landing and auth surfaces and represent real WCAG 2.1/2.2 failures (focus visible, label association, zoom, link names, nested interactives).

**How to apply:** Re-run this checklist on any new marketing page, auth page, or form component. Prefer native HTML (real checkboxes, associated labels, semantic `<button>`/`<a>`) before adding ARIA. Validate with axe-core and keyboard-only navigation.
