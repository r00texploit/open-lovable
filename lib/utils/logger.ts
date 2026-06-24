/**
 * Structured Logger
 * Provides consistent logging across the application with configurable levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class StructuredLogger implements Logger {
  private context: string;
  private minLevel: LogLevel;

  constructor(context: string, minLevel: LogLevel = 'info') {
    this.context = context;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.context}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    console.log(this.formatMessage('debug', message), context ? { ...context } : '');
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    console.log(this.formatMessage('info', message), context ? { ...context } : '');
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', message), context ? { ...context } : '');
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    console.error(this.formatMessage('error', message), {
      ...(context || {}),
      ...(error ? { errorMessage: error.message, stack: error.stack } : {}),
    });
  }
}

// Global logger registry
const loggers = new Map<string, Logger>();

export function getLogger(context: string, minLevel?: LogLevel): Logger {
  const key = `${context}:${minLevel || 'default'}`;
  if (!loggers.has(key)) {
    loggers.set(key, new StructuredLogger(context, minLevel));
  }
  return loggers.get(key)!;
}

// Default application logger
export const appLogger = getLogger('App', process.env.NODE_ENV === 'development' ? 'debug' : 'info');
