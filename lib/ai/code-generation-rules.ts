/**
 * AI Code Generation Rules
 *
 * These rules are injected into AI prompts to prevent generation of
 * problematic code that causes Vercel Sandbox errors.
 */

/**
 * Rules to prevent framer-motion and other animation libraries
 * that cause sandbox crashes and import errors.
 */
export const CODE_GENERATION_RULES = `
CRITICAL RULES FOR CODE GENERATION - VIOLATIONS WILL CAUSE CRASHES:

1. NEVER use framer-motion or any animation libraries - use CSS/Tailwind transitions only
   WRONG: import { motion } from "framer-motion"
   WRONG: import { AnimatePresence } from "framer-motion"
   WRONG: <motion.div>, <motion.button>, etc.
   CORRECT: Use Tailwind CSS classes: transition-all, duration-300, ease-in-out
   CORRECT: Use CSS keyframes in a <style> tag for complex animations

2. NEVER use Three.js, R3F (@react-three/fiber), or 3D libraries unless explicitly requested
   WRONG: import * as THREE from "three"
   WRONG: import { Canvas } from "@react-three/fiber"

3. NEVER use GSAP or other timeline-based animation libraries
   WRONG: import { gsap } from "gsap"

4. Use only these pre-installed packages (never install others without explicit approval):
   - react, react-dom
   - lucide-react (for icons ONLY)
   - @radix-ui/* (for accessible components)

5. All animations must use Tailwind CSS classes:
   - Use transition-all, duration-300, ease-in-out, animate-spin, animate-pulse
   - Use transform with translate, rotate, scale
   - Use opacity for fade effects

6. Modal/Drawer animations using CSS only:

   <div className={\`transition-all duration-300 ease-in-out \${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}\`}\gt

7. Page transitions: Use CSS classes with state management, no libraries.

8. Hover effects: Use Tailwind utilities like hover:scale-105 hover:shadow-lg

9. For loading skeletons: Use animate-pulse with CSS only, not libraries.

10. If you need complex animations: Use CSS @keyframes in a style tag or Tailwind animate utilities.

Remember: The sandbox has limited resources. Simple CSS animations work better and never crash.
`;

/**
 * Short version for inline prompts where brevity matters
 */
export const CODE_GENER_RULES_SHORT = `
CRITICAL: Use CSS/Tailwind for animations. NEVER use framer-motion, GSAP, Three.js.
Use only: react, react-dom, lucide-react. Pre-installed packages only.
`;

/**
 * Package import restrictions
 */
export const ALLOWED_PACKAGES = [
  // React core
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',

  // Icons
  'lucide-react',

  // Radix UI components (pre-installed for accessibility)
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-select',
  '@radix-ui/react-tabs',
  '@radix-ui/react-accordion',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-popover',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-separator',
  '@radix-ui/react-slider',
  '@radix-ui/react-switch',
  '@radix-ui/react-toast',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-label',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-slot',

  // Common utility libraries (safe to use)
  'clsx',
  'class-variance-authority',
  'tailwind-merge',
  'date-fns',
  'lodash',
  'lodash/debounce',
  'lodash/throttle',
  'uuid',
  'nanoid',
] as const;

/**
 * Blocked packages that cause sandbox crashes or are not allowed
 */
export const BLOCKED_PACKAGES = [
  'framer-motion',
  'gsap',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'react-spring',
  '@react-spring/web',
  'react-transition-group',
  'velocity-animate',
  'animejs',
  'anime.js',
  '@rive-app/react-canvas',
  'lottie-react',
  'react-lottie',
  '@dotlottie/react-player',
  'rive-react',
] as const;

/**
 * Check if a package is allowed
 */
export function isPackageAllowed(packageName: string): boolean {
  // Check if it's in the blocked list
  const normalizedName = packageName.toLowerCase().trim();

  // Check blocked packages
  if (BLOCKED_PACKAGES.some(blocked =>
    normalizedName === blocked.toLowerCase() ||
    normalizedName.startsWith(blocked.toLowerCase() + '/')
  )) {
    return false;
  }

  // Check if in allowed list (exact match or starts with)
  return ALLOWED_PACKAGES.some(allowed =>
    normalizedName === allowed.toLowerCase() ||
    normalizedName.startsWith(allowed.toLowerCase() + '/')
  );
}

/**
 * Get alternatives for blocked packages
 */
export function getPackageAlternative(packageName: string): string {
  const alternatives: Record<string, string> = {
    'framer-motion': 'CSS transitions with Tailwind (transition-all, duration-300, etc.)',
    'gsap': 'CSS animations with @keyframes or Tailwind animate utilities',
    'three': 'CSS 3D transforms (transform-style: preserve-3d, rotateX, rotateY)',
    '@react-three/fiber': 'CSS 3D transforms for simple 3D effects',
    '@react-three/drei': 'Custom CSS 3D implementations',
    'react-spring': 'CSS transitions with Tailwind',
    '@react-spring/web': 'CSS transitions with Tailwind',
    'react-transition-group': 'CSS transitions with React state management',
    'animejs': 'CSS animations or Web Animations API',
    'anime.js': 'CSS animations or Web Animations API',
    'lottie-react': 'SVG animations with CSS or embedded SVG',
    'react-lottie': 'SVG animations with CSS or embedded SVG',
  };

  return alternatives[packageName] || 'CSS animations with Tailwind or custom CSS';
}
