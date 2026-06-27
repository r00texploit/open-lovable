/**
 * Sandbox Health Monitor
 *
 * Monitors sandbox health and detects crashes early.
 * Prevents recreation loops with circuit breaker pattern.
 */

import { Logger } from '@/lib/sandbox/providers/base-provider';

export interface HealthMonitorConfig {
  checkIntervalMs: number;
  maxConsecutiveFailures: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenUntil?: Date;
  lastError?: string;
}

/**
 * Default configuration for health monitoring
 */
export const DEFAULT_HEALTH_CONFIG: HealthMonitorConfig = {
  checkIntervalMs: 10000,      // Check every 10 seconds
  maxConsecutiveFailures: 3,   // Allow up to 3 consecutive failures
  circuitBreakerThreshold: 3,  // Open circuit after 3 failures
  circuitBreakerResetMs: 5 * 60 * 1000,  // Reset after 5 minutes
};

/**
 * Tracks sandbox recreation attempts to prevent loops
 */
export class RecreationTracker {
  private attempts = new Map<string, { count: number; firstAttempt: number; lastAttempt: number }>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 3, windowMs = 5 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Record a recreation attempt for a sandbox
   */
  recordAttempt(sandboxId: string): { allowed: boolean; attempts: number; remaining: number } {
    const now = Date.now();
    const record = this.attempts.get(sandboxId);

    if (!record) {
      this.attempts.set(sandboxId, { count: 1, firstAttempt: now, lastAttempt: now });
      return { allowed: true, attempts: 1, remaining: this.maxAttempts - 1 };
    }

    // Reset if window has passed
    if (now - record.firstAttempt > this.windowMs) {
      this.attempts.set(sandboxId, { count: 1, firstAttempt: now, lastAttempt: now });
      return { allowed: true, attempts: 1, remaining: this.maxAttempts - 1 };
    }

    // Increment and check
    record.count++;
    record.lastAttempt = now;

    const allowed = record.count <= this.maxAttempts;
    return { allowed, attempts: record.count, remaining: Math.max(0, this.maxAttempts - record.count) };
  }

  /**
   * Check if recreation is allowed without incrementing
   */
  canRecreate(sandboxId: string): boolean {
    const record = this.attempts.get(sandboxId);
    if (!record) return true;

    const now = Date.now();
    if (now - record.firstAttempt > this.windowMs) return true;

    return record.count < this.maxAttempts;
  }

  /**
   * Reset tracking for a sandbox
   */
  reset(sandboxId: string): void {
    this.attempts.delete(sandboxId);
  }

  /**
   * Get current stats for a sandbox
   */
  getStats(sandboxId: string): { attempts: number; withinWindow: boolean } {
    const record = this.attempts.get(sandboxId);
    if (!record) return { attempts: 0, withinWindow: false };

    const now = Date.now();
    const withinWindow = now - record.firstAttempt <= this.windowMs;

    return { attempts: record.count, withinWindow };
  }
}

/**
 * Monitors sandbox health with circuit breaker pattern
 */
export class SandboxHealthMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private circuitOpen = false;
  private circuitOpenUntil: number | null = null;
  private lastError: string | null = null;
  private lastCheck: Date | null = null;
  private isRunning = false;

  constructor(
    private provider: { isHealthy(): Promise<boolean> },
    private config: HealthMonitorConfig = DEFAULT_HEALTH_CONFIG,
    private logger: Logger = console,
    private onUnhealthy?: (error: string) => void
  ) {}

  /**
   * Start monitoring the sandbox health
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Health monitor already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting sandbox health monitor');

    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.logger.info('Stopped sandbox health monitor');
  }

  /**
   * Get current health status
   */
  getStatus(): HealthStatus {
    return {
      isHealthy: this.isHealthy(),
      lastCheck: this.lastCheck || new Date(),
      consecutiveFailures: this.consecutiveFailures,
      circuitOpen: this.circuitOpen,
      circuitOpenUntil: this.circuitOpenUntil ? new Date(this.circuitOpenUntil) : undefined,
      lastError: this.lastError || undefined,
    };
  }

  /**
   * Perform a single health check
   */
  private async performHealthCheck(): Promise<void> {
    // Check if circuit breaker is open
    if (this.circuitOpen) {
      const now = Date.now();
      if (this.circuitOpenUntil && now > this.circuitOpenUntil) {
        this.logger.info('Circuit breaker reset - attempting health check');
        this.circuitOpen = false;
        this.circuitOpenUntil = null;
        this.consecutiveFailures = 0;
      } else {
        this.logger.debug('Circuit breaker open - skipping health check');
        return;
      }
    }

    try {
      const isHealthy = await this.provider.isHealthy();
      this.lastCheck = new Date();

      if (isHealthy) {
        if (this.consecutiveFailures > 0) {
          this.logger.info('Sandbox recovered from unhealthy state');
        }
        this.consecutiveFailures = 0;
        this.lastError = null;
      } else {
        this.handleFailure('Health check failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleFailure(errorMessage);
    }
  }

  /**
   * Handle a health check failure
   */
  private handleFailure(errorMessage: string): void {
    this.consecutiveFailures++;
    this.lastError = errorMessage;
    this.lastCheck = new Date();

    this.logger.warn(
      `Health check failed (${this.consecutiveFailures}/${this.config.maxConsecutiveFailures}):`,
      errorMessage
    );

    // Check if we should open the circuit breaker
    if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.circuitOpenUntil = Date.now() + this.config.circuitBreakerResetMs;
      this.logger.error(
        `Circuit breaker opened - will retry after ${Math.round(this.config.circuitBreakerResetMs / 1000)}s`
      );
    }

    // Check if we've exceeded max failures
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.logger.error('Max consecutive failures reached - triggering recovery');
      this.onUnhealthy?.(errorMessage);
    }
  }

  /**
   * Check if sandbox is currently healthy
   */
  private isHealthy(): boolean {
    if (this.circuitOpen) return false;
    return this.consecutiveFailures < this.config.maxConsecutiveFailures;
  }

  /**
   * Force a health check immediately
   */
  async checkNow(): Promise<boolean> {
    try {
      const isHealthy = await this.provider.isHealthy();
      this.lastCheck = new Date();

      if (!isHealthy) {
        this.handleFailure('Forced health check failed');
      } else {
        this.consecutiveFailures = 0;
      }

      return isHealthy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleFailure(errorMessage);
      return false;
    }
  }
}

/**
 * Global recreation tracker instance
 */
export const globalRecreationTracker = new RecreationTracker(3, 5 * 60 * 1000);
