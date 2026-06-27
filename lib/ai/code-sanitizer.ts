/**
 * Code Sanitizer
 *
 * Sanitizes AI-generated code to remove problematic patterns
 * before applying to the sandbox.
 */

import { BLOCKED_PACKAGES, CODE_GENERATION_RULES } from './code-generation-rules';

export interface SanitizationResult {
  sanitized: string;
  original: string;
  wasModified: boolean;
  warnings: string[];
  blocked: boolean;
  replacements: { original: string; replacement: string; line: number }[];
}

/**
 * CSS animation replacement for framer-motion
 */
const CSS_ANIMATION_REPLACEMENTS: Record<string, string> = {
  // Framer-motion to CSS
  "import { motion } from 'framer-motion'": '',
  "import { motion } from \"framer-motion\"": '',
  "import { AnimatePresence } from 'framer-motion'": '',
  "import { AnimatePresence } from \"framer-motion\"": '',
  "import { motion, AnimatePresence } from 'framer-motion'": '',
  "import { motion, AnimatePresence } from \"framer-motion\"": '',
  'motion.div': 'div',
  'motion.span': 'span',
  'motion.button': 'button',
  'motion.a': 'a',
  'motion.img': 'img',
  'motion.section': 'section',
  'motion.header': 'header',
  'motion.footer': 'footer',
  'motion.nav': 'nav',
  'motion.article': 'article',
  'motion.aside': 'aside',
  'motion.main': 'main',
  'motion.ul': 'ul',
  'motion.ol': 'ol',
  'motion.li': 'li',
  'motion.p': 'p',
  'motion.h1': 'h1',
  'motion.h2': 'h2',
  'motion.h3': 'h3',
  'motion.h4': 'h4',
  'motion.h5': 'h5',
  'motion.h6': 'h6',
};

/**
 * CSS-based animation patterns to replace framer-motion props
 */
const ANIMATION_PROP_PATTERNS = [
  // Remove framer-motion specific props
  /\s+initial\s*=\s*{{[^}]*}}\s*/g,
  /\s+animate\s*=\s*{{[^}]*}}\s*/g,
  /\s+exit\s*=\s*{{[^}]*}}\s*/g,
  /\s+transition\s*=\s*{{[^}]*}}\s*/g,
  /\s+whileHover\s*=\s*{{[^}]*}}\s*/g,
  /\s+whileTap\s*=\s*{{[^}]*}}\s*/g,
  /\s+whileFocus\s*=\s*{{[^}]*}}\s*/g,
  /\s+whileDrag\s*=\s*{{[^}]*}}\s*/g,
  /\s+variants\s*=\s*{{[^}]*}}\s*/g,
  /\s+layout\s*(?:={[^}]*}|\s)/g,
  /\s+layoutId\s*=\s*"[^"]*"\s*/g,
];

/**
 * Check if code contains blocked patterns
 */
function containsBlockedPatterns(code: string): { blocked: boolean; patterns: string[] } {
  const patterns: string[] = [];

  // Check for framer-motion
  if (code.includes('framer-motion')) {
    patterns.push('framer-motion');
  }

  // Check for other blocked libraries
  if (code.includes('gsap')) {
    patterns.push('gsap');
  }
  if (code.includes('three') && code.includes('import')) {
    patterns.push('three.js');
  }
  if (code.includes('@react-three')) {
    patterns.push('@react-three');
  }

  // Check for eval (security risk)
  if (/\beval\s*\(/.test(code)) {
    patterns.push('eval()');
  }

  // Check for Function constructor
  if (/new\s+Function\s*\(/.test(code)) {
    patterns.push('new Function()');
  }

  return { blocked: patterns.length > 0, patterns };
}

/**
 * Replace framer-motion imports and components with standard HTML
 */
function replaceFramerMotion(code: string): { code: string; replacements: { original: string; replacement: string; line: number }[] } {
  const lines = code.split('\n');
  const replacements: { original: string; replacement: string; line: number }[] = [];
  let sanitizedCode = code;

  // Track if we removed framer-motion imports
  let removedImport = false;

  // Process line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Remove framer-motion imports
    if (line.includes('framer-motion')) {
      const original = line;
      lines[i] = '';
      replacements.push({ original: original.trim(), replacement: '/* Removed framer-motion import */', line: lineNumber });
      removedImport = true;
      continue;
    }

    // Replace motion components
    let modifiedLine = line;
    for (const [pattern, replacement] of Object.entries(CSS_ANIMATION_REPLACEMENTS)) {
      if (modifiedLine.includes(pattern) && pattern !== '' && !pattern.startsWith('import')) {
        const original = modifiedLine;
        modifiedLine = modifiedLine.split(pattern).join(replacement);
        if (original !== modifiedLine) {
          replacements.push({ original: pattern, replacement, line: lineNumber });
        }
      }
    }

    // Remove framer-motion props
    for (const pattern of ANIMATION_PROP_PATTERNS) {
      const original = modifiedLine;
      modifiedLine = modifiedLine.replace(pattern, ' ');
      if (original !== modifiedLine) {
        replacements.push({ original: original.trim(), replacement: modifiedLine.trim(), line: lineNumber });
      }
    }

    lines[i] = modifiedLine;
  }

  // Rejoin code
  sanitizedCode = lines.join('\n');

  // Clean up empty lines
  sanitizedCode = sanitizedCode.replace(/\n{3,}/g, '\n\n');

  return { code: sanitizedCode, replacements };
}

/**
 * Add CSS animations as fallback for removed framer-motion
 */
function addCSSAnimationStyles(code: string): string {
  // Check if we need to add animation styles
  if (!code.includes('motion.') && !code.includes('framer-motion')) {
    return code;
  }

  // Find a good place to insert styles (before first export or component)
  const styleBlock = `
/* Auto-generated CSS animations (replaced framer-motion) */
<style jsx>{\`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(10px); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }
  .animate-fade-out {
    animation: fadeOut 0.2s ease-in forwards;
  }
  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
  }
  .animate-scale-in {
    animation: scaleIn 0.2s ease-out forwards;
  }
\`}</style>`;

  // Try to find the best insertion point
  const exportMatch = code.match(/export\s+(?:default\s+)?(?:function|const|class)\s+\w+/);
  if (exportMatch && exportMatch.index) {
    const insertIndex = exportMatch.index;
    return code.slice(0, insertIndex) + styleBlock + '\n\n' + code.slice(insertIndex);
  }

  // Fallback: add at the beginning
  return styleBlock + '\n\n' + code;
}

/**
 * Sanitize code to remove problematic patterns
 */
export function sanitizeCode(code: string): SanitizationResult {
  const warnings: string[] = [];
  const original = code;

  // Check for blocked patterns
  const { blocked, patterns } = containsBlockedPatterns(code);

  if (blocked) {
    warnings.push(`Blocked patterns detected: ${patterns.join(', ')}`);
  }

  // Replace framer-motion
  const { code: framerMotionReplaced, replacements } = replaceFramerMotion(code);
  code = framerMotionReplaced;

  if (replacements.length > 0) {
    warnings.push(`Replaced ${replacements.length} framer-motion patterns with CSS alternatives`);
  }

  // Remove eval and new Function (security)
  if (/\beval\s*\(/.test(code)) {
    warnings.push('Removed eval() calls for security');
    code = code.replace(/\beval\s*\([^)]*\)/g, '/* eval() removed for security */');
  }

  if (/new\s+Function\s*\(/.test(code)) {
    warnings.push('Removed new Function() calls for security');
    code = code.replace(/new\s+Function\s*\([^)]*\)/g, '/* new Function() removed for security */');
  }

  // Add CSS animation styles if needed
  if (patterns.includes('framer-motion')) {
    code = addCSSAnimationStyles(code);
    warnings.push('Added CSS animation styles to replace framer-motion functionality');
  }

  const wasModified = original !== code;

  return {
    sanitized: code,
    original,
    wasModified,
    warnings,
    blocked: patterns.some(p => p === 'eval()' || p === 'new Function()'),
    replacements,
  };
}

/**
 * Quick check if code needs sanitization
 */
export function needsSanitization(code: string): boolean {
  return containsBlockedPatterns(code).blocked;
}

/**
 * Sanitize a batch of files
 */
export function sanitizeFiles(files: Record<string, string>): {
  sanitized: Record<string, string>;
  results: Record<string, SanitizationResult>;
  hasBlockedContent: boolean;
} {
  const sanitized: Record<string, string> = {};
  const results: Record<string, SanitizationResult> = {};
  let hasBlockedContent = false;

  for (const [path, content] of Object.entries(files)) {
    const result = sanitizeCode(content);
    sanitized[path] = result.sanitized;
    results[path] = result;

    if (result.blocked) {
      hasBlockedContent = true;
    }
  }

  return { sanitized, results, hasBlockedContent };
}
