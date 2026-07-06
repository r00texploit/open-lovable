# Noeron — Fire Design System

> **Project:** Noeron (AI Website Builder)
> **Framework:** Next.js 15 + Tailwind CSS + Radix UI + Framer Motion
> **Generated:** 2026-07-06
> **Last reviewed:** 2026-07-06

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Spacing](#4-spacing)
5. [Border Radius](#5-border-radius)
6. [Elevation & Shadows](#6-elevation--shadows)
7. [Motion & Animation](#7-motion--animation)
8. [Component Library](#8-component-library)
9. [Breakpoints](#9-breakpoints)
10. [Accessibility](#10-accessibility)
11. [Anti-Patterns](#11-anti-patterns)
12. [File Map](#12-file-map)

---

## 1. Philosophy

The Fire Design System is built around a warm, fire-inspired palette that conveys energy, creativity, and craftsmanship. It avoids generic SaaS aesthetics in favor of purposeful warmth, strong hierarchy, and tactile depth.

| Principle | How it shows up |
|-----------|-----------------|
| **Warmth over coldness** | Cream backgrounds, ember accents, ink-dark surfaces |
| **Purposeful motion** | Animations improve comprehension, not decoration |
| **Accessible by default** | Visible focus states, reduced-motion support, 4.5:1 contrast |
| **P3 color space** | Richer colors on supported displays (sRGB fallback) |

---

## 2. Color Palette

### 2.1 Brand Colors

```
Brand Orange       #ff6728   --brand-orange       Primary CTA, links, selection
Brand Orange Hover #ff7b3d   --brand-orange-hover Hover states
Brand Orange Light #ffb07f   --brand-orange-light Subtle highlights
Brand Orange Lighter #ffd0ad --brand-orange-lighter Background tints
Brand Orange Dark  #e0490f   --brand-orange-dark  Pressed/active
Brand Olive        #8f9b5b   --brand-olive        Supporting accent
```

### 2.2 Heat Colors (Fire-inspired)

```
Heat 100  #fa5d19  --heat-100  Core fire accent
Heat 200  #ff6600  --heat-200  Hover glow
Heat 110  #c14914  --heat-110  Darker variant
Heat 4    rgba(250,93,25,0.039)  --heat-4  Subtle backgrounds
Heat 8    rgba(250,93,25,0.078)  --heat-8  Light fills
Heat 16   rgba(250,93,25,0.161)  --heat-16 Borders
Heat 40   rgba(250,93,25,0.400)  --heat-40 Strong overlays
```

### 2.3 Warm Palette (Landing & Auth)

```
Warm 025  #fffcf4  Lightest surface
Warm 050  #fff9ef  Light background
Warm 100  #fff7e8  Shell background, warm surfaces
Warm 150  #fbf3e2  Card backgrounds
Warm 200  #ead7b8  Muted surfaces
Warm 300  #d8c5a8  Dividers, borders
Warm 400  #645744  Muted text on light
Warm 500  #5f5343  Secondary text
Warm 700  #2a221a  Dark text
Warm 800  #17130f  Ink dark
Warm 900  #11100d  Near black
Warm 950  #14100c  Deepest dark
```

### 2.4 Neutral / App Colors

```
Background Lighter  #fbfbfb  --background-lighter  App light surface
Background Base     #f9f9f9  --background-base     Default app background
Foreground          #262626  --foreground          Primary text
Foreground Dimmer   rgba(38,38,38,0.722) --foreground-dimmer Secondary text
Border Faint        #ededed  --border-faint        Subtle borders
Border Muted        #e8e8e8  --border-muted        Standard borders
Border Loud         #e6e6e6  --border-loud         Prominent borders
Accent Black        #262626  --accent-black        UI chrome
Accent White        #ffffff  --accent-white        Inverted surfaces
```

### 2.5 Semantic Accents

```
Amethyst  #9061ff  --accent-amethyst  Purple accent
Bluetron  #2a6dfb  --accent-bluetron  Blue accent
Crimson   #eb3424  --accent-crimson   Error / danger
Forest    #42c366  --accent-forest    Success
Honey     #ecb730  --accent-honey     Warning
```

### 2.6 Dark Mode Tokens (HSL)

The app uses `darkMode: "class"` with these semantic tokens:

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `0 0% 100%` | `20 14% 8%` |
| `--foreground` | `240 10% 3.9%` | `30 20% 97%` |
| `--primary` | `240 5.9% 10%` | `25 95% 53%` |
| `--primary-foreground` | `0 0% 98%` | `30 20% 97%` |
| `--secondary` | `240 4.8% 95.9%` | `20 10% 18%` |
| `--muted` | `240 4.8% 95.9%` | `20 10% 20%` |
| `--accent` | `240 4.8% 95.9%` | `25 95% 53%` |
| `--card` | `0 0% 100%` | `20 12% 12%` |
| `--popover` | `0 0% 100%` | `20 12% 12%` |
| `--border` | `240 5.9% 90%` | `20 10% 22%` |
| `--ring` | `240 10% 3.9%` | `25 95% 53%` |

---

## 3. Typography

### 3.1 Font Stack

| Role | Font | Fallback | Variable |
|------|------|----------|----------|
| Heading | Space Grotesk | sans-serif | `--font-heading` |
| Body | Source Sans 3 | sans-serif | `--font-body` |
| UI / Sans | Geist Sans | Inter, system-ui | `--font-geist-sans` |
| Mono | Geist Mono | SF Mono, Consolas | `--font-geist-mono` |
| ASCII / Code | Roboto Mono | monospace | `--font-roboto-mono` |

### 3.2 Type Scale (Tailwind Tokens)

| Token | Size | Line Height | Letter Spacing | Weight |
|-------|------|-------------|----------------|--------|
| `title-h1` | 60px | 64px | -0.3px | 500 |
| `title-h2` | 52px | 56px | -0.52px | 500 |
| `title-h3` | 40px | 44px | -0.4px | 500 |
| `title-h4` | 32px | 36px | -0.32px | 500 |
| `title-h5` | 24px | 32px | -0.24px | 500 |
| `body-x-large` | 20px | 28px | -0.1px | 400 |
| `body-large` | 16px | 24px | 0 | 400 |
| `body-medium` | 14px | 20px | 0.14px | 400 |
| `body-small` | 13px | 20px | 0 | 400 |
| `label-x-large` | 20px | 28px | -0.1px | 450 |
| `label-large` | 16px | 24px | 0 | 450 |
| `label-medium` | 14px | 20px | 0 | 450 |
| `label-small` | 13px | 20px | 0 | 450 |
| `label-x-small` | 12px | 20px | 0 | 450 |
| `mono-medium` | 14px | 22px | 0 | 400 |
| `mono-small` | 13px | 20px | 0 | 500 |

### 3.3 Fluid Display Sizes (Custom CSS)

| Class | Clamp | Properties |
|-------|-------|------------|
| `.text-hero` | `clamp(48px, 8vw, 88px)` | 1.05 lh, -0.03em, 600 wt |
| `.text-display` | `clamp(40px, 6vw, 64px)` | 1.1 lh, -0.02em, 600 wt |
| `.text-headline` | `clamp(32px, 4vw, 48px)` | 1.15 lh, -0.02em, 600 wt |
| `.text-title` | `clamp(24px, 3vw, 32px)` | 1.2 lh, -0.01em, 600 wt |
| `.text-subtitle` | `clamp(18px, 2vw, 22px)` | 1.5 lh, -0.01em, 500 wt |
| `.text-body` | `clamp(16px, 1.5vw, 18px)` | 1.7 lh, 400 wt |

---

## 4. Spacing

### 4.1 Base Scale (8px grid)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-20` | 80px |
| `--space-24` | 96px |
| `--space-32` | 128px |

### 4.2 Fluid Section Spacing

| Token | Value |
|-------|-------|
| `--section-sm` | `clamp(3rem, 5vw, 4rem)` |
| `--section-md` | `clamp(4rem, 8vw, 6rem)` |
| `--section-lg` | `clamp(6rem, 12vw, 10rem)` |

---

## 5. Border Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 16px |
| `--radius-xl` | 24px |
| `--radius-full` | 999px |

---

## 6. Elevation & Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-1` | `0 1px 2px rgba(0,0,0,0.1)` | Subtle lift |
| `--shadow-2` | `0 4px 12px rgba(0,0,0,0.15)` | Cards, buttons |
| `--shadow-3` | `0 12px 32px rgba(0,0,0,0.2)` | Modals, dropdowns |
| `--shadow-4` | `0 24px 64px rgba(0,0,0,0.25)` | Hero images, featured cards |

---

## 7. Motion & Animation

### 7.1 Primary Easing

```
cubic-bezier(0.32, 0.72, 0, 1)
```

### 7.2 Default Transitions

| Property | Duration | Easing |
|----------|----------|--------|
| Transform | 200ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Background | 200ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Box-shadow | 200ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Border-color | 200ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Opacity | 300ms | ease |

### 7.3 Named Animations

| Name | Description |
|------|-------------|
| `fade-in-up` | Opacity 0→1 + translateY(20px→0), 0.6s ease-out |
| `pulse-subtle` | Opacity 0.95→1→0.95, 2s infinite |
| `text-shimmer` | Gray gradient sweep, 3s linear |
| `heat-glow` | Box-shadow pulse in orange, 3s ease-in-out |
| `flicker` | Scale + opacity flicker, 2s ease-in-out |
| `glow` | Box-shadow radius expansion, 2s ease-in-out |
| `marquee` | Horizontal scroll loop, configurable speed |

### 7.4 Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 8. Component Library

### 8.1 Button

**Location:** `components/ui/button.tsx` (custom, not shadcn)

**Props Interface:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive" | "code";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}
```

**Variants:**

| Variant | Visual | Usage |
|---------|--------|-------|
| `default` | Orange fill (#ff6728), black text, pill radius, layered shadow | Primary CTA |
| `secondary` | Dark with white/8% background, subtle border | Secondary action on dark surfaces |
| `ghost` | Transparent, white/70% text, hover adds white/5% background | Tertiary actions |
| `outline` | Transparent, white border/20% | Bordered actions |
| `destructive` | Red fill (red-500), white text | Dangerous actions |
| `code` | Dark fill (#262626), white text | Code-related actions |

**Sizes:**

| Size | Height | Padding |
|------|--------|---------|
| `default` | 44px (h-11) | 20px x 10px (px-5 py-2.5) |
| `sm` | 36px (h-9) | 12px x 6px (px-3 py-1.5) |
| `lg` | 48px (h-12) | 24px x 12px (px-6 py-3) |
| `icon` | 40px (h-10) | 8px (p-2) |

**States:**

| State | Behavior |
|-------|----------|
| Default | Layered orange shadow, inner white highlight |
| Hover | `translateY(-2px)`, shadow expands, bg lightens to #ff7b3d |
| Active | `translateY(0) scale(0.98)`, shadow compresses |
| Focus | `ring-2 ring-brand-orange ring-offset-2 ring-offset-dark-950` |
| Disabled | `opacity-50`, `pointer-events-none` |

**Usage:**

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="lg">
  Get Started
</Button>

<Button variant="ghost" size="sm">
  Cancel
</Button>
```

---

### 8.2 Input

**Location:** `components/ui/input.tsx`

**Props:** Extends `React.ComponentPropsWithoutRef<"input">`

**Visual:**

- Wrapped in `<label>` for full clickable area
- Background: white
- Border: `inside-border` pseudo-element with `--black-alpha-8`
- Hover: bg shifts to `--black-alpha-2`, border to `--black-alpha-12`
- Focus: bg resets to white, border to `--heat-100` at 1.25px
- Text: `body-medium`

**Usage:**

```tsx
import { Input } from "@/components/ui/input";

<Input placeholder="Enter your email" />
```

---

### 8.3 Textarea

**Location:** `components/ui/textarea.tsx`

**Props:** Extends `React.TextareaHTMLAttributes<HTMLTextAreaElement>`

**Visual:**

- Min-height: 80px
- Border: zinc-300 with inset shadow (`inset_0px_-2px_0px_0px_#e4e4e7`)
- Hover: shadow darkens to `#d4d4d8`
- Focus: ring-2 on `--ring`, inset shadow shifts to `#f97316`

**Usage:**

```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea placeholder="Describe your project..." />
```

---

### 8.4 Card

**Location:** `components/ui/shadcn/card.tsx`

**Parts:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

**Visual:**

- Border: `border-border-muted`
- Background: `--background-base` (#f9f9f9)
- Radius: 12px (`rounded-12`)
- Padding: 16px (`p-16`)

**Usage:**

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/shadcn/card";

<Card>
  <CardHeader>
    <CardTitle>Project Name</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

---

### 8.5 Dialog

**Location:** `components/ui/shadcn/dialog.tsx`

**Parts:** `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`

**Props Interface:**

```tsx
interface DialogContentProps {
  hideCloseButton?: boolean;  // default: false
}
```

**Visual:**

- Overlay: `bg-background-base/80` + `backdrop-blur-md`, z-1000
- Content: max-w-[520px], white bg, `border-border-faint`, `shadow-2xl`
- Mobile: slides up from bottom
- Desktop: zoom + fade from center
- Close button: absolute top-right, `hover:bg-black-alpha-4`

**States:**

| State | Animation |
|-------|-----------|
| Open | `fade-in-0` + `zoom-in-95` + `slide-in-from-bottom-10` (mobile) |
| Closed | `fade-out-0` + `zoom-out-95` + `slide-out-to-bottom-10` (mobile) |

**Usage:**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/shadcn/dialog";

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

---

### 8.6 Sheet

**Location:** `components/ui/shadcn/sheet.tsx`

**Parts:** `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`

**Props:**

```tsx
interface SheetContentProps {
  side?: "top" | "bottom" | "left" | "right";  // default: "right"
}
```

**Visual:**

- Overlay: `bg-black/80`, z-50
- Content: white bg, `shadow-lg`, gap-4
- Slide animations based on `side`
- Default right side: `w-3/4 sm:max-w-sm`
- Duration: 300ms close, 500ms open

**Usage:**

```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/shadcn/sheet";

<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent side="right">
    <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
  </SheetContent>
</Sheet>
```

---

### 8.7 Switch

**Location:** `components/ui/shadcn/switch.tsx`

**Props:**

```tsx
interface SwitchProps {
  size?: "default" | "sm";
  // Inherits from Radix Switch: checked, onCheckedChange, disabled, etc.
}
```

**Visual:**

| Size | Track | Thumb |
|------|-------|-------|
| `default` | h-5 w-9 | h-4 w-4, translate-x-4 when checked |
| `sm` | h-4 w-7 | h-3 w-3, translate-x-3 when checked |

- Unchecked: `bg-input`
- Checked: `bg-muted-foreground`
- Thumb: white with shadow
- Focus: `ring-2 ring-ring ring-offset-2`

**Usage:**

```tsx
import { Switch } from "@/components/ui/shadcn/switch";

<Switch size="sm" />
<Switch defaultChecked />
```

---

### 8.8 Select

**Location:** `components/ui/shadcn/select.tsx`

**Parts:** `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`

**Visual:**

- Trigger: `border-input bg-background`, focus ring on `--ring`
- Content: `z-50`, popper positioned, animate-in/out
- Item: hover/focus `bg-accent text-accent-foreground`
- Chevron icon on trigger

**Usage:**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/shadcn/select";

<Select>
  <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
  </SelectContent>
</Select>
```

---

### 8.9 Badge

**Location:** `components/ui/shadcn/badge.tsx`

**Props:** Extends `HTMLAttributes<HTMLDivElement>` (no variants)

**Visual:**

- Flex layout with `gap-10`
- Background: `--background-base`
- Bottom border: `bg-border-faint` (1px absolute line)
- Text: `label-x-small`
- Decorative `//` dividers in `--black-alpha-16`
- Padding-bottom: 16px (`pb-16`)

**Usage:**

```tsx
import Badge from "@/components/ui/shadcn/badge";

<Badge>New Feature</Badge>
```

---

### 8.10 Checkbox (Custom)

**Location:** `components/ui/checkbox.tsx`

**Props:**

```tsx
interface CheckboxProps {
  label?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
}
```

**Visual:**

- 16x16px rounded square with zinc-300 border
- Inset shadow: `inset_0px_-1px_0px_0px_#e4e4e7`
- Checked: `bg-orange-500 border-orange-500` with white Check icon
- Disabled: `opacity-50 cursor-not-allowed`

**Usage:**

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<Checkbox label="I agree to terms" onChange={(v) => console.log(v)} />
```

---

### 8.11 Tooltip

**Location:** `components/ui/tooltip.tsx`

**Props:**

```tsx
interface TooltipProps {
  description?: string;
  children?: React.ReactNode;
  offset?: number;       // default: 8
  delay?: number;        // default: 0.5 (seconds)
  wrapperClassName?: string;
  className?: string;
}
```

**Visual:**

- Portaled to `<body>`
- Positioned above trigger element
- Background: `bg-black-alpha-64` with `backdrop-blur-[6px]`
- Text: `body-medium` in white
- Radius: 12px
- Animation: Framer Motion spring (stiffness 240, damping 16)
- Exit: blur + opacity fade

**Usage:**

```tsx
import Tooltip from "@/components/ui/tooltip";

<Tooltip description="This is a tooltip">
  <button>Hover me</button>
</Tooltip>
```

---

### 8.12 Spinner

**Location:** `components/ui/spinner.tsx`

**Props:**

```tsx
interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";  // default: "md"
  finished?: boolean;            // default: false
}
```

**Visual:**

- `finished=true`: shows ✓ checkmark
- `finished=false`: spinning SVG
- Sizes: sm (16px), md (80px), lg (32px)

**Usage:**

```tsx
import Spinner from "@/components/ui/spinner";

<Spinner size="md" />
<Spinner finished />
```

---

### 8.13 Empty State

**Location:** `components/ui/empty-state.tsx`

**Props:**

```tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
  size?: "sm" | "md" | "lg";  // default: "md"
}
```

**Usage:**

```tsx
import { EmptyState } from "@/components/ui/empty-state";

<EmptyState
  title="No projects yet"
  description="Create your first project to get started."
  action={{ label: "Create Project", onClick: () => {} }}
/>
```

---

### 8.14 Loading Skeleton

**Location:** `components/ui/loading-skeleton.tsx`

**Props:**

```tsx
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;    // default: false
  animate?: boolean;   // default: true
}
```

**Visual:**

- Background: `bg-gray-200 dark:bg-gray-800`
- `animate=true`: `animate-pulse`
- `circle=true`: `rounded-full`

**Usage:**

```tsx
import { Skeleton } from "@/components/ui/loading-skeleton";

<Skeleton width={200} height={24} />
<Skeleton circle width={40} height={40} />
```

---

### 8.15 Toast (Sonner)

**Location:** `components/ui/shadcn/toast.tsx`

**Parts:** `Toaster` (provider component)

**Props:** Inherits from `Sonner`

**Visual:**

- Light: white bg, zinc-950 text, zinc-200 border
- Dark: zinc-950 bg, zinc-50 text, zinc-800 border
- Action button: zinc-900 bg, zinc-50 text
- Cancel button: zinc-100 bg, zinc-500 text

**Enhanced Toast Helpers:** `components/ui/enhanced-toast.tsx`

```tsx
import { successToast, errorToast, warningToast, infoToast, loadingToast } from "@/components/ui/enhanced-toast";

successToast("Saved!", { description: "Your changes have been saved." });
errorToast("Error", { description: "Something went wrong." });
```

---

### 8.16 Label

**Location:** `components/ui/label.tsx`

**Props:** Extends Radix `LabelPrimitive.Root`

**Visual:**

- Text: `text-sm leading-tight`
- Disabled peer: `cursor-not-allowed opacity-70`

**Usage:**

```tsx
import { Label } from "@/components/ui/label";

<Label htmlFor="email">Email</Label>
```

---

## 9. Breakpoints

| Name | Value | Description |
|------|-------|-------------|
| `xs` | ≥390px | Small phones |
| `xs-max` | ≤389px | Tiny screens |
| `sm` | ≥576px | Phones |
| `sm-max` | ≤575px | Portrait phones |
| `md` | ≥768px | Tablets |
| `md-max` | ≤767px | Small tablets |
| `lg` | ≥996px | Small laptops |
| `lg-max` | ≤995px | Large tablets |
| `xl` | ≥1200px | Desktops |
| `xl-max` | ≤1199px | Small desktops |
| `2xl` | ≥1400px | Large desktops (container max) |

---

## 10. Accessibility

### 10.1 Focus Visible

```css
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--brand-orange);
  outline-offset: 2px;
}
```

### 10.2 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 10.3 High Contrast

```css
@media (prefers-contrast: high) {
  .glass, .glass-dark { border-width: 2px; }
  .card-elevated { border-width: 2px; }
}
```

### 10.4 Checklist

- [ ] Focus visible on all interactive elements
- [ ] Reduced motion respected
- [ ] High contrast mode supported
- [ ] Contrast ratio ≥ 4.5:1 for body text
- [ ] Skip link provided
- [ ] `.sr-only` utility available
- [ ] No `maximum-scale` blocking pinch-zoom

---

## 11. Anti-Patterns (Do NOT Use)

- ❌ **Emojis as icons** — Use SVG (Lucide, Heroicons) consistently.
- ❌ **Missing `cursor: pointer`** — All clickable elements must show affordance.
- ❌ **Layout-shifting hovers** — Hover transforms must not push sibling content.
- ❌ **Low contrast text** — Maintain 4.5:1 minimum at all times.
- ❌ **Instant state changes** — Always animate with 150–300ms transitions.
- ❌ **Invisible focus states** — Keyboard navigation must be visually tracked.
- ❌ **Generic purple gradients** — Unless explicitly on-brand.
- ❌ **Glassmorphism spam** — Use `.glass` only when depth is semantically needed.
- ❌ **Inconsistent border radii** — Stick to the 6/10/16/24/999 scale.

---

## 12. File Map

### 12.1 Tokens & Config

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Theme tokens, custom utilities, breakpoints |
| `colors.json` | Programmatic color definitions (hex + P3) |
| `app/globals.css` | Design tokens, component classes, a11y rules |
| `styles/main.css` | Tailwind imports, dark mode, keyframes |
| `styles/fire.css` | Core Fire Design System color definitions |
| `styles/design-system/colors.css` | All CSS custom properties for colors |
| `styles/design-system/typography.css` | Type scale classes |
| `styles/design-system/animations.css` | Named keyframe animations |
| `styles/design-system/utilities.css` | Gradient, mask, blur, scrollbar utilities |
| `styles/components/button.css` | Button-specific shadow stacking |

### 12.2 Components

| File | Type | Description |
|------|------|-------------|
| `components/ui/button.tsx` | Custom | **Primary** — CVA variants: default, secondary, ghost, outline, destructive, code |
| `components/ui/input.tsx` | Custom | **Primary** — Label-wrapped with inside-border |
| `components/ui/textarea.tsx` | Custom | **Primary** — Inset shadow, focus ring |
| `components/ui/checkbox.tsx` | Custom | **Primary** — Orange checked state, optional label |
| `components/ui/spinner.tsx` | Custom | **Primary** — sm/md/lg + finished state |
| `components/ui/empty-state.tsx` | Custom | **Primary** — Icon, title, description, actions |
| `components/ui/loading-skeleton.tsx` | Custom | **Primary** — Pulse animation, circle variant |
| `components/ui/tooltip.tsx` | Custom | **Primary** — Framer Motion, portal to body |
| `components/ui/code.tsx` | Custom | **Primary** — Syntax-highlighted code block |
| `components/ui/label.tsx` | Custom | **Primary** — Radix Label with disabled peer support |
| `components/ui/enhanced-toast.tsx` | Custom | **Primary** — Sonner wrapper: success/error/warning/info/loading |
| `components/ui/shadcn/card.tsx` | shadcn | Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter |
| `components/ui/shadcn/dialog.tsx` | shadcn | Dialog + DialogContent + DialogHeader + DialogTitle + DialogDescription |
| `components/ui/shadcn/sheet.tsx` | shadcn | Sheet + SheetContent (top/bottom/left/right) |
| `components/ui/shadcn/select.tsx` | shadcn | Select + SelectTrigger + SelectContent + SelectItem |
| `components/ui/shadcn/switch.tsx` | shadcn | Switch with default/sm sizes |
| `components/ui/shadcn/badge.tsx` | shadcn | Badge with decorative dividers |
| `components/ui/shadcn/toast.tsx` | shadcn | Sonner Toaster provider |
| `components/ui/shadcn/label.tsx` | shadcn | Radix Label |
| `components/ui/shadcn/checkbox.tsx` | shadcn | Radix Checkbox (fallback) |
| `components/ui/shadcn/accordion.tsx` | shadcn | Accordion |
| `components/ui/shadcn/alert-dialog.tsx` | shadcn | Alert Dialog |
| `components/ui/shadcn/collapsible.tsx` | shadcn | Collapsible |
| `components/ui/shadcn/context-menu.tsx` | shadcn | Context Menu |
| `components/ui/shadcn/dropdown-menu.tsx` | shadcn | Dropdown Menu |
| `components/ui/shadcn/navigation-menu.tsx` | shadcn | Navigation Menu |
| `components/ui/shadcn/popover.tsx` | shadcn | Popover |
| `components/ui/shadcn/progress.tsx` | shadcn | Progress bar |
| `components/ui/shadcn/scroll-area.tsx` | shadcn | Scroll Area |
| `components/ui/shadcn/separator.tsx` | shadcn | Separator |
| `components/ui/shadcn/slider.tsx` | shadcn | Slider |
| `components/ui/shadcn/tabs.tsx` | shadcn | Tabs |
| `components/ui/shadcn/toggle.tsx` | shadcn | Toggle |
| `components/ui/shadcn/tooltip-radix.tsx` | shadcn | Radix Tooltip |
| `components/ui/shadcn/data-table.tsx` | shadcn | Data Table |
| `components/ui/shadcn/form.tsx` | shadcn | Form primitives |
| `components/ui/shadcn/combobox.tsx` | shadcn | Combobox |
| `components/ui/shadcn/button.tsx` | shadcn | Legacy shadcn button (primary/secondary/tertiary/playground/destructive) |
| `components/ui/shadcn/button.css` | shadcn | Legacy button styles |

---

## 13. Keeping This Document in Sync

This document is **hand-written** and will drift from code over time. To keep it current:

1. **After adding a new color** to `colors.json`, add it to Section 2.
2. **After adding a new component variant**, update the CVA table in Section 8.
3. **After adding a new shadcn component**, add it to the inventory in Section 12.2.
4. **Consider generating from code:** Parse `tailwind.config.ts` + `colors.json` + component files to auto-generate token sections.

---

*End of Fire Design System documentation.*
