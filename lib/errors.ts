/**
 * Custom Error Classes
 * Standardized error handling with context and error codes
 */

export type ErrorCode =
  // Sandbox errors
  | 'SANDBOX_NOT_FOUND'
  | 'SANDBOX_CREATION_FAILED'
  | 'SANDBOX_TERMINATED'
  | 'SANDBOX_TIMEOUT'
  | 'SANDBOX_COMMAND_FAILED'
  | 'SANDBOX_FILE_NOT_FOUND'
  | 'SANDBOX_FILE_WRITE_FAILED'
  | 'SANDBOX_FILE_READ_FAILED'
  | 'SANDBOX_PACKAGE_INSTALL_FAILED'
  | 'SANDBOX_VITE_START_FAILED'
  // Provider errors
  | 'PROVIDER_NOT_AVAILABLE'
  | 'PROVIDER_CREDENTIALS_MISSING'
  | 'PROVIDER_API_ERROR'
  // Session errors
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_CREATE_FAILED'
  // AI errors
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_GENERATION_FAILED'
  | 'AI_RATE_LIMIT'
  // General errors
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR';

export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Base error class with error codes and context
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode = 'INTERNAL_ERROR',
    context?: ErrorContext,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Sandbox-specific errors
 */
export class SandboxError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'SANDBOX_COMMAND_FAILED',
    context?: ErrorContext
  ) {
    super(message, code, context, true);
  }

  static notFound(sandboxId: string): SandboxError {
    return new SandboxError(
      `Sandbox not found: ${sandboxId}`,
      'SANDBOX_NOT_FOUND',
      { sandboxId }
    );
  }

  static creationFailed(reason: string, context?: ErrorContext): SandboxError {
    return new SandboxError(
      `Failed to create sandbox: ${reason}`,
      'SANDBOX_CREATION_FAILED',
      context
    );
  }

  static commandFailed(command: string, exitCode: number, stderr: string): SandboxError {
    return new SandboxError(
      `Command failed with exit code ${exitCode}: ${command}`,
      'SANDBOX_COMMAND_FAILED',
      { command, exitCode, stderr: stderr.slice(0, 500) }
    );
  }

  static fileNotFound(path: string): SandboxError {
    return new SandboxError(
      `File not found: ${path}`,
      'SANDBOX_FILE_NOT_FOUND',
      { path }
    );
  }

  static fileWriteFailed(path: string, reason: string): SandboxError {
    return new SandboxError(
      `Failed to write file ${path}: ${reason}`,
      'SANDBOX_FILE_WRITE_FAILED',
      { path, reason }
    );
  }

  static fileReadFailed(path: string, reason: string): SandboxError {
    return new SandboxError(
      `Failed to read file ${path}: ${reason}`,
      'SANDBOX_FILE_READ_FAILED',
      { path, reason }
    );
  }

  static packageInstallFailed(packages: string[], reason: string): SandboxError {
    return new SandboxError(
      `Failed to install packages: ${packages.join(', ')}`,
      'SANDBOX_PACKAGE_INSTALL_FAILED',
      { packages, reason }
    );
  }
}

/**
 * Provider-specific errors
 */
export class ProviderError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'PROVIDER_API_ERROR',
    context?: ErrorContext
  ) {
    super(message, code, context, true);
  }

  static notAvailable(provider: string): ProviderError {
    return new ProviderError(
      `Provider not available: ${provider}`,
      'PROVIDER_NOT_AVAILABLE',
      { provider }
    );
  }

  static credentialsMissing(provider: string, missingFields: string[]): ProviderError {
    return new ProviderError(
      `Missing credentials for ${provider}: ${missingFields.join(', ')}`,
      'PROVIDER_CREDENTIALS_MISSING',
      { provider, missingFields }
    );
  }
}

/**
 * Session-specific errors
 */
export class SessionError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'SESSION_NOT_FOUND',
    context?: ErrorContext
  ) {
    super(message, code, context, true);
  }

  static notFound(sessionId: string): SessionError {
    return new SessionError(
      `Session not found: ${sessionId}`,
      'SESSION_NOT_FOUND',
      { sessionId }
    );
  }

  static expired(sessionId: string, expiresAt: Date): SessionError {
    return new SessionError(
      `Session expired: ${sessionId}`,
      'SESSION_EXPIRED',
      { sessionId, expiresAt }
    );
  }
}

/**
 * AI generation errors
 */
export class AIError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'AI_GENERATION_FAILED',
    context?: ErrorContext
  ) {
    super(message, code, context, true);
  }

  static modelNotFound(modelId: string): AIError {
    return new AIError(
      `AI model not found: ${modelId}`,
      'AI_MODEL_NOT_FOUND',
      { modelId }
    );
  }

  static generationFailed(modelId: string, reason: string): AIError {
    return new AIError(
      `AI generation failed for model ${modelId}: ${reason}`,
      'AI_GENERATION_FAILED',
      { modelId, reason }
    );
  }

  static rateLimited(modelId: string, retryAfter?: number): AIError {
    return new AIError(
      `Rate limited for model ${modelId}`,
      'AI_RATE_LIMIT',
      { modelId, retryAfter }
    );
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Safely extract error code from unknown error
 */
export function getErrorCode(error: unknown): ErrorCode | undefined {
  if (isAppError(error)) {
    return error.code;
  }
  return undefined;
}
