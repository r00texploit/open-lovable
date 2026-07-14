/**
 * Base Sandbox Provider
 * Shared implementation for sandbox providers to reduce duplication
 */

import { SandboxProvider, SandboxInfo, CommandResult, SandboxProviderConfig } from '../types';
import { getViteAppTemplates, getInitialFilePaths, ViteAppFiles } from '../templates/vite-templates';

// Logger interface for structured logging
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// Default logger that respects debug settings
export function createLogger(context: string, enableDebug: boolean = false): Logger {
  const formatMessage = (level: LogLevel, message: string): string => {
    return `[${context}] ${level.toUpperCase()}: ${message}`;
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (enableDebug) {
        console.log(formatMessage('debug', message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      console.log(formatMessage('info', message), ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(formatMessage('warn', message), ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(formatMessage('error', message), ...args);
    },
  };
}

/**
 * Base class for sandbox providers with shared implementations
 */
export abstract class BaseSandboxProvider extends SandboxProvider {
  protected existingFiles: Set<string> = new Set();
  protected logger: Logger;
  protected abstract providerName: 'vercel' | 'e2b' | 'vps';
  protected abstract workingDirectory: string;

  constructor(config: SandboxProviderConfig, logger?: Logger, providerName?: 'vercel' | 'e2b' | 'vps') {
    super(config);
    // Use provided logger or create default one with provider name
    this.logger = logger || createLogger((providerName || 'sandbox').toUpperCase());
  }

  /**
   * Get the full path by prepending working directory if needed
   */
  protected getFullPath(path: string): string {
    return path.startsWith('/') ? path : `${this.workingDirectory}/${path}`;
  }

  /**
   * Add a file to the existing files tracking
   */
  protected trackFile(path: string): void {
    this.existingFiles.add(path);
  }

  /**
   * Write multiple files with Buffer support
   * Default implementation: loop over files and call writeFile
   * Override this in providers that have native bulk write support
   */
  async writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<void> {
    this.logger.info(`Writing ${files.length} files via base provider`);
    for (const file of files) {
      // Convert Buffer to base64 string for writeFile
      const base64Content = file.content.toString('base64');
      await this.writeFile(file.path, base64Content);
    }
  }

  /**
   * Remove all tracked files
   */
  protected clearTrackedFiles(): void {
    this.existingFiles.clear();
  }

  /**
   * Track multiple files at once
   */
  protected trackFiles(paths: string[]): void {
    paths.forEach(p => this.existingFiles.add(p));
  }

  /**
   * Check if a file is being tracked
   */
  protected isTracked(path: string): boolean {
    return this.existingFiles.has(path);
  }

  /**
   * Get the delay to wait for Vite server startup
   */
  protected getViteStartupDelay(): number {
    return this.providerName === 'vercel'
      ? 7000
      : 10000;
  }

  /**
   * Execute a command with standardized error handling
   * This is a template method - subclasses must implement the actual execution
   */
  protected abstract executeCommand(
    cmd: string,
    args?: string[],
    cwd?: string,
    env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>;

  /**
   * Write file with fallback mechanism
   * Subclasses must implement the primary writeFile mechanism
   */
  protected abstract writeFilePrimary(path: string, content: string): Promise<void>;

  /**
   * Fallback method for writing files using shell commands
   */
  protected async writeFileFallback(fullPath: string, content: string): Promise<void> {
    this.logger.debug(`Using fallback file write for: ${fullPath}`);

    // Ensure directory exists
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (dir) {
      await this.executeCommand('mkdir', ['-p', dir]);
    }

    // Detect base64 content (used for images)
    const isBase64 = fullPath.includes('/images/')
      && !content.includes('\n')
      && /^[A-Za-z0-9+/=]+$/.test(content);

    if (isBase64) {
      // Use base64 decoding for binary files
      await this.executeCommand(
        'bash',
        ['-c', `echo "${content}" | base64 -d > "${fullPath}"`],
        this.workingDirectory
      );
    } else {
      // Escape content for shell (text files)
      const escapedContent = content
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\n');

      await this.executeCommand(
        'bash',
        ['-c', `printf '%s' "${escapedContent}" > "${fullPath}"`],
        this.workingDirectory
      );
    }
  }

  /**
   * Setup Vite app with shared templates
   */
  async setupViteApp(): Promise<void> {
    this.logger.info('Setting up Vite React app');

    const templates = getViteAppTemplates(this.providerName);

    // Create directory structure and write all files
    await this.createDirectories();
    await this.writeTemplateFiles(templates);

    // Install dependencies
    await this.installDependencies();

    // Start Vite server
    await this.startViteServer();

    // Track initial files
    this.trackFiles(getInitialFilePaths());

    this.logger.info('Vite app setup complete');
  }

  /**
   * Create required directory structure
   */
  protected abstract createDirectories(): Promise<void>;

  /**
   * Write all template files
   */
  protected async writeTemplateFiles(templates: ViteAppFiles): Promise<void> {
    for (const [path, content] of Object.entries(templates)) {
      try {
        await this.writeFilePrimary(path, content);
        this.logger.debug(`Written: ${path}`);
      } catch (error) {
        this.logger.warn(`Failed to write ${path}, trying fallback`, error);
        const fullPath = this.getFullPath(path);
        await this.writeFileFallback(fullPath, content);
      }
    }
  }

  /**
   * Install npm dependencies
   */
  protected abstract installDependencies(): Promise<void>;

  /**
   * Start the Vite dev server
   */
  protected abstract startViteServer(): Promise<void>;

  /**
   * Restart the Vite dev server
   */
  async restartViteServer(): Promise<void> {
    this.logger.info('Restarting Vite server');

    // Kill existing Vite process
    await this.killViteProcess();

    // Wait briefly
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start Vite
    await this.startViteServer();
  }

  /**
   * Kill any running Vite processes
   */
  protected abstract killViteProcess(): Promise<void>;

  getSandboxUrl(): string | null {
    return this.sandboxInfo?.url || null;
  }

  getSandboxInfo(): SandboxInfo | null {
    return this.sandboxInfo;
  }

  isAlive(): boolean {
    return !!this.sandbox;
  }
}
