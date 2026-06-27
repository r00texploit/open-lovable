---
name: project-noeron-design-system
description: Noeron marketing UI design tokens, styling approach, and component conventions observed during visual review.
metadata:
  type: project
---

Noeron’s marketing UI uses a custom CSS-utility layer rather than a single component library.

**Visual direction**
- Dark luxury landing page: background `#0A0A0B`, brand accent `#ff6728`, secondary violet glows.
- Light luxury pricing/auth surfaces: warm cream/beige via `.ol-shell`, `.ol-ink-panel`, `.ol-bezel`, `.ol-auth-bg` in `styles/main.css`.

**Tokens live in two places**
- `app/globals.css` defines spacing, typography utilities (`.text-hero`, `.text-headline`, `.text-body`), `.btn-primary`/`.btn-secondary`, `.card-elevated`, `.glass`, `.nav-link`.
- `styles/main.css` defines the alternate light-theme utilities (`.ol-primary-button`, `.ol-secondary-button`, `.ol-input`) plus HSL shadcn tokens.

**Font pairing (currently half-applied)**
- `app/layout.tsx` loads Space Grotesk as `--font-heading` and Source Sans 3 as `--font-body`, but headings do not explicitly use the heading font.
- `tailwind.config.ts` also registers `font-heading` and `font-body` families.

**Animation conventions**
- Framer Motion `useInView` is used everywhere with `initial={{ opacity: 0, y: 30 }}` and a single easing curve `[0.25, 0.46, 0.45, 0.94]`.
- `prefers-reduced-motion` is handled in `app/globals.css` for CSS transitions but not explicitly inside the FAQ accordion motion.

**Why it matters:** The project is trying to build a bespoke visual system, but the system is split across three button/input languages and two palettes, which makes the UI feel inconsistent even when individual sections look polished.

**How to apply:** Treat `app/globals.css` as the canonical marketing design-token file; consolidate `.btn-*`/`.ol-*` duplicates into `components/ui/button.tsx`; apply `font-heading` to all heading utilities; keep the light theme only if it is intentionally extended to the whole marketing site.
