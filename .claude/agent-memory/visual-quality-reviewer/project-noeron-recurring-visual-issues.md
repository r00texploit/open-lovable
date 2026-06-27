---
name: project-noeron-recurring-visual-issues
description: Recurring visual/UX quality issues seen in Noeron marketing surfaces and what to check in future reviews.
metadata:
  type: project
---

Recurring issues to check in future Noeron visual reviews:

1. **Below-fold content hidden by default.** Landing sections rely on `useInView` with `initial={{ opacity: 0 }}`. Full-page screenshots and static renders show blank sections until scroll. Verify content is visible by default and animations are progressive enhancement.

2. **Global focus reset on text inputs.** `styles/main.css` removes `outline`/`box-shadow` for every `input[type="text"]` to style the hero illustration. Check that any hero input override is scoped and does not affect real form inputs.

3. **WCAG contrast on subtle text.** `text-white/60` is used for body/description copy on the dark background and is likely below AA. Prefer `text-white/75`–`text-white/80` for body text.

4. **Nested interactive elements.** Pricing cards wrap `<button>` inside `<Link>`. Watch for this pattern in any card/CTA component.

5. **Multiple competing button/input systems.** The codebase has `components/ui/button.tsx`, `.btn-*` utilities in `app/globals.css`, and `.ol-*` utilities in `styles/main.css`. New marketing UI should reuse a single system.

6. **Heading font not applied.** `--font-heading` exists but heading utility classes do not set it. Verify headings actually render in the display font.

7. **Two marketing themes.** The landing page is dark/orange; pricing and auth are warm cream. Any new marketing page should match the chosen canonical palette or be explicitly documented as a second theme.

**Why it matters:** These issues keep appearing because the styling system has parallel, unmerged layers. Fixing the root systems will prevent the same defects from recurring.

**How to apply:** In every visual review, run a quick checklist against these seven items before judging polish details.
