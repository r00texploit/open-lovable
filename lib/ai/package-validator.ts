/**
 * Package Validator
 *
 * Validates package imports in AI-generated code against allowlists.
 * Prevents installation of packages that cause sandbox crashes.
 */

import { BLOCKED_PACKAGES, ALLOWED_PACKAGES, getPackageAlternative, isPackageAllowed } from './code-generation-rules';

export interface PackageValidationResult {
  valid: boolean;
  detectedPackages: string[];
  blockedPackages: { name: string; alternative: string; line: number }[];
  allowedPackages: string[];
  unknownPackages: string[];
  canAutoFix: boolean;
}

/**
 * Regular expressions for detecting imports in various formats
 */
const IMPORT_PATTERNS = [
  // ES6 imports: import X from 'package'
  /import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"];?/g,

  // CommonJS requires: require('package')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,

  // Dynamic imports: import('package')
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,

  // CDN/script tags in HTML
  /src\s*=\s*['"](?:https?:\/\/[^\/]*\/)?([^\/\s'"]+)['"]/g,

  // CSS/SCSS imports
  /@import\s+['"]([^'"]+)['"];?/g,
];

/**
 * Extract all package imports from code
 */
export function extractPackageImports(code: string): { name: string; line: number }[] {
  const packages: { name: string; line: number }[] = [];
  const lines = code.split('\n');

  // Track which lines have imports to avoid duplicates
  const foundPackages = new Set<string>();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;

    for (const pattern of IMPORT_PATTERNS) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(line)) !== null) {
        const packageName = match[1];

        // Skip relative imports, URLs, and built-in modules
        if (
          packageName.startsWith('.') ||
          packageName.startsWith('http') ||
          packageName.startsWith('/') ||
          packageName === 'react' ||
          packageName === 'react-dom' ||
          packageName === 'react/jsx-runtime' ||
          packageName.startsWith('node:') ||
          ['fs', 'path', 'os', 'crypto', 'util', 'stream', 'http', 'https', 'url', 'querystring'].includes(packageName)
        ) {
          continue;
        }

        // Extract the main package name (not sub-paths like 'lodash/debounce')
        const mainPackageName = packageName.split('/')[0];

        if (!foundPackages.has(packageName)) {
          foundPackages.add(packageName);
          packages.push({ name: packageName, line: lineNumber });
        }
      }
    }
  }

  return packages;
}

/**
 * Validate packages in generated code
 */
export function validatePackages(code: string): PackageValidationResult {
  const detected = extractPackageImports(code);
  const packageNames = [...new Set(detected.map(p => p.name))];

  const blockedPackages: { name: string; alternative: string; line: number }[] = [];
  const allowedPackages: string[] = [];
  const unknownPackages: string[] = [];

  for (const pkg of detected) {
    if (BLOCKED_PACKAGES.some(blocked =>
      pkg.name === blocked ||
      pkg.name.startsWith(blocked + '/')
    )) {
      blockedPackages.push({
        name: pkg.name,
        alternative: getPackageAlternative(pkg.name),
        line: pkg.line,
      });
    } else if (ALLOWED_PACKAGES.some(allowed =>
      pkg.name === allowed ||
      pkg.name.startsWith(allowed + '/')
    )) {
      if (!allowedPackages.includes(pkg.name)) {
        allowedPackages.push(pkg.name);
      }
    } else {
      // Unknown package - might need installation
      if (!unknownPackages.includes(pkg.name)) {
        unknownPackages.push(pkg.name);
      }
    }
  }

  const canAutoFix = blockedPackages.length > 0 &&
    blockedPackages.every(bp => bp.name === 'framer-motion' || bp.name.startsWith('framer-motion/'));

  return {
    valid: blockedPackages.length === 0,
    detectedPackages: packageNames,
    blockedPackages,
    allowedPackages,
    unknownPackages,
    canAutoFix,
  };
}

/**
 * Generate a user-friendly validation report
 */
export function generateValidationReport(result: PackageValidationResult): string {
  if (result.valid && result.unknownPackages.length === 0) {
    return 'All packages validated successfully ✓';
  }

  const lines: string[] = [];

  if (result.blockedPackages.length > 0) {
    lines.push('⚠️ Blocked packages detected:');
    for (const bp of result.blockedPackages) {
      lines.push(`  Line ${bp.line}: "${bp.name}" - Use: ${bp.alternative}`);
    }
    lines.push('');
  }

  if (result.unknownPackages.length > 0) {
    lines.push('📦 Additional packages required:');
    for (const pkg of result.unknownPackages) {
      lines.push(`  - ${pkg}`);
    }
    lines.push('');
  }

  if (result.allowedPackages.length > 0) {
    lines.push('✓ Pre-installed packages used:');
    for (const pkg of result.allowedPackages) {
      lines.push(`  - ${pkg}`);
    }
  }

  return lines.join('\n');
}

/**
 * Quick check if code contains any blocked packages
 */
export function hasBlockedPackages(code: string): boolean {
  const normalizedCode = code.toLowerCase();
  return BLOCKED_PACKAGES.some(pkg =>
    normalizedCode.includes(`from '${pkg}'`) ||
    normalizedCode.includes(`from "${pkg}"`) ||
    normalizedCode.includes(`require('${pkg}')`) ||
    normalizedCode.includes(`require("${pkg}")`) ||
    normalizedCode.includes(`import('${pkg}')`) ||
    normalizedCode.includes(`import("${pkg}")`)
  );
}

/**
 * Get list of packages that need installation from code
 */
export function getPackagesToInstall(code: string): string[] {
  const result = validatePackages(code);
  // Return unknown packages that aren't in allowed list
  return result.unknownPackages.filter(pkg =>
    !ALLOWED_PACKAGES.some(allowed => pkg === allowed || pkg.startsWith(allowed + '/'))
  );
}
