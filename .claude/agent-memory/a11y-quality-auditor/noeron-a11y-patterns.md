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

**Why:** These issues show up repeatedly across landing and auth surfaces and represent real WCAG 2.1/2.2 failures (focus visible, label association, zoom, link names, nested interactives).

**How to apply:** Re-run this checklist on any new marketing page, auth page, or form component. Prefer native HTML (real checkboxes, associated labels, semantic `<button>`/`<a>`) before adding ARIA. Validate with axe-core and keyboard-only navigation.
