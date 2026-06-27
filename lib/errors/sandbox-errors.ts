/**
 * Sandbox Error Classification
 *
 * Maps Vercel sandbox errors to user-friendly messages and recovery actions.
 */

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ErrorAction = 'auto-retry' | 'recreate-sandbox' | 'fix-code' | 'user-input' | 'none';

export interface ErrorInfo {
  code: string;
  title: string;
  message: string;
  description: string;
  severity: ErrorSeverity;
  action: ErrorAction;
  autoRecoverable: boolean;
  retryable: boolean;
  userAction?: string;
}

/**
 * Error classification for Vercel Sandbox errors
 */
export const SANDBOX_ERRORS: Record<string, ErrorInfo> = {
  SANDBOX_NOT_LISTENING: {
    code: 'SANDBOX_NOT_LISTENING',
    title: 'Development Server Unavailable',
    message: 'The development server stopped responding. Attempting to restart...',
    description: 'The Vite development server is not listening on the expected port. This can happen if the server crashed or failed to start.',
    severity: 'critical',
    action: 'recreate-sandbox',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Please wait while we restart the development environment.',
  },

  SANDBOX_TIMEOUT: {
    code: 'SANDBOX_TIMEOUT',
    title: 'Sandbox Session Expired',
    message: 'Your sandbox session has expired. Creating a new environment...',
    description: 'The sandbox session exceeded its maximum duration and was terminated.',
    severity: 'high',
    action: 'recreate-sandbox',
    autoRecoverable: true,
    retryable: false,
    userAction: 'Please wait while we create a new development environment.',
  },

  VERCEL_API_ERROR_422: {
    code: 'VERCEL_API_ERROR_422',
    title: 'Sandbox Session Invalid',
    message: 'The sandbox session is no longer valid. Creating a fresh environment...',
    description: 'Vercel API returned 422 Unprocessable Entity. The sandbox ID may have expired or become invalid.',
    severity: 'high',
    action: 'recreate-sandbox',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Please wait while we create a new development environment.',
  },

  FRAMER_MOTION_ERROR: {
    code: 'FRAMER_MOTION_ERROR',
    title: 'Animation Library Not Supported',
    message: 'The code uses framer-motion which can cause stability issues. Using CSS animations instead...',
    description: 'Framer Motion and similar animation libraries can cause the Vite dev server to crash. CSS animations are more stable.',
    severity: 'high',
    action: 'fix-code',
    autoRecoverable: true,
    retryable: true,
    userAction: 'The code has been automatically fixed to use CSS animations.',
  },

  PACKAGE_INSTALL_FAILED: {
    code: 'PACKAGE_INSTALL_FAILED',
    message: 'Could not install required packages. Retrying with alternative method...',
    title: 'Package Installation Failed',
    description: 'npm install failed to complete successfully. This may be due to network issues, package conflicts, or invalid package names.',
    severity: 'high',
    action: 'auto-retry',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Retrying package installation...',
  },

  VITE_START_FAILED: {
    code: 'VITE_START_FAILED',
    title: 'Development Server Failed to Start',
    message: 'The development server failed to start. Checking logs and retrying...',
    description: 'Vite failed to start, usually due to configuration errors, missing dependencies, or port conflicts.',
    severity: 'critical',
    action: 'auto-retry',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Please wait while we diagnose and fix the issue.',
  },

  PORT_BINDING_FAILED: {
    code: 'PORT_BINDING_FAILED',
    title: 'Port Binding Failed',
    message: 'Could not bind to port 3000. The port may be in use.',
    description: 'The application could not bind to the expected port. This usually means another process is using it.',
    severity: 'high',
    action: 'recreate-sandbox',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Recreating the sandbox to free up the port...',
  },

  MODULE_NOT_FOUND: {
    code: 'MODULE_NOT_FOUND',
    title: 'Missing Module',
    message: 'A required module was not found. Installing missing packages...',
    description: 'The code is trying to import a package that is not installed.',
    severity: 'medium',
    action: 'auto-retry',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Installing missing dependencies...',
  },

  SYNTAX_ERROR: {
    code: 'SYNTAX_ERROR',
    title: 'JavaScript/TypeScript Syntax Error',
    message: 'The generated code contains a syntax error. Regenerating...',
    description: 'There is a syntax error in the code that prevents it from running.',
    severity: 'high',
    action: 'fix-code',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Regenerating the code to fix syntax errors...',
  },

  EVAL_ERROR: {
    code: 'EVAL_ERROR',
    title: 'Security Violation',
    message: 'The code uses eval() or similar unsafe operations which are not allowed.',
    description: 'Using eval() or Function constructor is blocked for security reasons.',
    severity: 'critical',
    action: 'fix-code',
    autoRecoverable: true,
    retryable: false,
    userAction: 'The code has been sanitized to remove unsafe operations.',
  },

  RECREATION_LOOP_DETECTED: {
    code: 'RECREATION_LOOP_DETECTED',
    title: 'Too Many Recovery Attempts',
    message: 'The sandbox has been recreated multiple times. There may be a persistent issue with the code.',
    description: 'The system has attempted to recreate the sandbox too many times, indicating a persistent problem.',
    severity: 'critical',
    action: 'user-input',
    autoRecoverable: false,
    retryable: false,
    userAction: 'Please try a different request or simplify your code. If the issue persists, contact support.',
  },

  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Retrying...',
    description: 'An unknown error occurred that could not be classified.',
    severity: 'high',
    action: 'auto-retry',
    autoRecoverable: true,
    retryable: true,
    userAction: 'Attempting to recover...',
  },
};

/**
 * Pattern-based error detection
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; errorCode: string }> = [
  { pattern: /SANDBOX_NOT_LISTENING/i, errorCode: 'SANDBOX_NOT_LISTENING' },
  { pattern: /422|unprocessable entity/i, errorCode: 'VERCEL_API_ERROR_422' },
  { pattern: /port.*3000.*already in use|address already in use/i, errorCode: 'PORT_BINDING_FAILED' },
  { pattern: /framer-motion|framer motion/i, errorCode: 'FRAMER_MOTION_ERROR' },
  { pattern: /cannot find module|module not found/i, errorCode: 'MODULE_NOT_FOUND' },
  { pattern: /unexpected token|syntax error|unexpected identifier/i, errorCode: 'SYNTAX_ERROR' },
  { pattern: /eval is not defined|Function is not a constructor/i, errorCode: 'EVAL_ERROR' },
  { pattern: /npm.*ERR/i, errorCode: 'PACKAGE_INSTALL_FAILED' },
  { pattern: /vite.*error|failed to start server/i, errorCode: 'VITE_START_FAILED' },
  { pattern: /sandbox.*timeout|session.*expired/i, errorCode: 'SANDBOX_TIMEOUT' },
  { pattern: /too many recreation|recreation loop/i, errorCode: 'RECREATION_LOOP_DETECTED' },
];

/**
 * Classify an error message to get error information
 */
export function classifyError(errorMessage: string): ErrorInfo {
  const normalizedError = errorMessage.toLowerCase();

  for (const { pattern, errorCode } of ERROR_PATTERNS) {
    if (pattern.test(normalizedError)) {
      return SANDBOX_ERRORS[errorCode] || SANDBOX_ERRORS.UNKNOWN_ERROR;
    }
  }

  return SANDBOX_ERRORS.UNKNOWN_ERROR;
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(errorMessage: string): boolean {
  const errorInfo = classifyError(errorMessage);
  return errorInfo.autoRecoverable;
}

/**
 * Check if an error should trigger a recreation
 */
export function shouldRecreateSandbox(errorMessage: string): boolean {
  const errorInfo = classifyError(errorMessage);
  return errorInfo.action === 'recreate-sandbox';
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(errorMessage: string): { title: string; message: string; action?: string } {
  const errorInfo = classifyError(errorMessage);
  return {
    title: errorInfo.title,
    message: errorInfo.message,
    action: errorInfo.userAction,
  };
}

/**
 * Format error for logging
 */
export function formatErrorForLog(error: Error | string, context?: Record<string, unknown>): string {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorInfo = classifyError(errorMessage);
  const timestamp = new Date().toISOString();

  const logData = {
    timestamp,
    code: errorInfo.code,
    severity: errorInfo.severity,
    message: errorMessage,
    ...context,
  };

  return JSON.stringify(logData);
}

/**
 * Error recovery strategy
 */
export interface RecoveryStrategy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry(error: ErrorInfo): boolean;
  getDelay(retryCount: number): number;
}

/**
 * Default recovery strategy with exponential backoff
 */
export const DEFAULT_RECOVERY_STRATEGY: RecoveryStrategy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,

  shouldRetry(error: ErrorInfo): boolean {
    return error.retryable && error.autoRecoverable;
  },

  getDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s
    const delay = this.baseDelayMs * Math.pow(2, retryCount - 1);
    return Math.min(delay, this.maxDelayMs);
  },
};
