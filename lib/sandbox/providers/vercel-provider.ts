import { SandboxInfo, CommandResult, SandboxCreateOptions, SandboxProviderConfig } from '../types';
import { BaseSandboxProvider, Logger } from './base-provider';
import { appConfig } from '@/config/app.config';

// Dynamic import for Vercel Sandbox SDK to avoid client-side bundling
async function getVercelSandbox() {
  const { Sandbox } = await import('@vercel/sandbox');
  return Sandbox;
}

function hasUsableOidcToken(): boolean {
  const token = process.env.VERCEL_OIDC_TOKEN;
  return !!token && token !== 'auto_generated_by_vercel_env_pull';
}

function buildCredentials(): Record<string, string> {
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID) {
    return { teamId: process.env.VERCEL_TEAM_ID, projectId: process.env.VERCEL_PROJECT_ID, token: process.env.VERCEL_TOKEN };
  }
  if (hasUsableOidcToken()) {
    return {};
  }
  return {};
}

export class VercelProvider extends BaseSandboxProvider {
  protected providerName: 'vercel' | 'e2b' = 'vercel';
  protected workingDirectory = '/vercel/sandbox';
  private appSandboxId: string | null = null;

  constructor(config: SandboxProviderConfig = {}, logger?: Logger) {
    super(config, logger, 'vercel');
  }

  private buildSandboxInfo(appSandboxId: string): SandboxInfo {
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    const sandboxUrl = this.sandbox.domain(appConfig.vercelSandbox.devPort);
    return {
      sandboxId: appSandboxId,
      url: sandboxUrl,
      provider: 'vercel',
      createdAt: new Date(),
      sandboxName: this.sandbox.name,
      runtimeStatus: this.sandbox.status,
      currentSnapshotId: this.sandbox.currentSnapshotId,
    };
  }

  async reconnect(sandboxName: string, appSandboxId: string = sandboxName): Promise<SandboxInfo> {
    const Sandbox = await getVercelSandbox();
    const credentials = buildCredentials();
    this.appSandboxId = appSandboxId;
    this.sandbox = await Sandbox.get({
      name: sandboxName,
      resume: true,
      onResume: async (sandbox: any) => {
        this.sandbox = sandbox;
        await this.restartViteServer();
      },
      ...credentials
    });
    await this.ensureViteServerReady();
    this.sandboxInfo = this.buildSandboxInfo(appSandboxId);
    return this.sandboxInfo;
  }

  async createSandbox(options: SandboxCreateOptions = {}): Promise<SandboxInfo> {
    try {
      const Sandbox = await getVercelSandbox();

      // Kill existing sandbox if any
      if (this.sandbox) {
        try {
          await this.sandbox.stop();
        } catch (e) {
          this.logger.error('Failed to stop existing sandbox:', e);
        }
        this.sandbox = null;
      }

      // Clear existing files tracking
      this.clearTrackedFiles();

      const appSandboxId = options.appSandboxId || options.sandboxName || `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const sandboxName = options.sandboxName || appSandboxId;
      this.appSandboxId = appSandboxId;

      const sandboxConfig: Record<string, unknown> = {
        name: sandboxName,
        timeout: appConfig.vercelSandbox.timeoutMs,
        runtime: appConfig.vercelSandbox.runtime,
        ports: [appConfig.vercelSandbox.devPort],
        persistent: true,
        snapshotExpiration: 0,
        keepLastSnapshots: { count: 1, expiration: 0 },
        resume: true,
        onCreate: async (sandbox: any) => {
          this.sandbox = sandbox;
          if (options.setupOnCreate) {
            await this.setupViteApp();
          }
        },
        onResume: async (sandbox: any) => {
          this.sandbox = sandbox;
          await this.restartViteServer();
        }
      };

      Object.assign(sandboxConfig, buildCredentials());

      // Plan-aware fallback: the Vercel Sandbox API caps `timeout` by plan
      // (Hobby/Pro-trial = 45m, Pro/Enterprise = 24h). If the requested timeout
      // exceeds the current plan cap, the API returns 400 `timeout should be <= 45m`.
      // Retry once with the 45m Hobby-safe ceiling so creation succeeds regardless
      // of plan/propagation state; when the plan allows the full timeout, the
      // first attempt succeeds and this branch is skipped.
      const HOBBY_TIMEOUT_MS = 45 * 60 * 1000;
      try {
        this.sandbox = await Sandbox.getOrCreate(sandboxConfig as Parameters<typeof Sandbox.getOrCreate>[0]);
      } catch (err) {
        const msg = (err as Error)?.message || '';
        const requestedMs = appConfig.vercelSandbox.timeoutMs;
        const isTimeoutCapError = /timeout.*<=.*\d+m|should be <= \d+m/i.test(msg)
          && requestedMs > HOBBY_TIMEOUT_MS;
        if (!isTimeoutCapError) {
          throw err;
        }
        this.logger.warn(
          `Sandbox timeout ${requestedMs}ms rejected by plan cap (${msg}); retrying with 45m.`
        );
        sandboxConfig.timeout = HOBBY_TIMEOUT_MS;
        this.sandbox = await Sandbox.getOrCreate(sandboxConfig as Parameters<typeof Sandbox.getOrCreate>[0]);
      }
      if (options.setupOnCreate) {
        await this.ensureViteServerReady();
      }
      this.sandboxInfo = this.buildSandboxInfo(appSandboxId);

      return this.sandboxInfo;

    } catch (error) {
      this.logger.error('Error creating sandbox:', error);
      throw error;
    }
  }

  async extendTimeout(durationMs: number): Promise<boolean> {
    if (!this.sandbox) {
      return false;
    }
    try {
      await this.sandbox.extendTimeout(durationMs);
      if (this.appSandboxId) {
        this.sandboxInfo = this.buildSandboxInfo(this.appSandboxId);
      }
      return true;
    } catch (error: unknown) {
      this.logger.warn('Could not extend sandbox timeout:', (error as Error)?.message || error);
      return false;
    }
  }

  protected async executeCommand(
    cmd: string,
    args?: string[],
    cwd?: string,
    env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    const result = await this.sandbox.runCommand({
      cmd,
      args: args || [],
      cwd: cwd || this.workingDirectory,
      env: env || {}
    });

    // Handle stdout and stderr - they might be functions in Vercel SDK
    let stdout = '';
    let stderr = '';

    try {
      if (typeof result.stdout === 'function') {
        stdout = await result.stdout();
      } else {
        stdout = result.stdout || '';
      }
    } catch {
      stdout = '';
    }

    try {
      if (typeof result.stderr === 'function') {
        stderr = await result.stderr();
      } else {
        stderr = result.stderr || '';
      }
    } catch {
      stderr = '';
    }

    return {
      stdout,
      stderr,
      exitCode: result.exitCode || 0
    };
  }

  async runCommand(command: string): Promise<CommandResult> {
    try {
      const result = await this.executeCommand('bash', ['-c', command]);

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        success: result.exitCode === 0
      };
    } catch (error: unknown) {
      return {
        stdout: '',
        stderr: (error as Error).message || 'Command failed',
        exitCode: 1,
        success: false
      };
    }
  }

  protected async writeFilePrimary(path: string, content: string): Promise<void> {
    console.log(`[VercelProvider] writeFilePrimary: ${path}`);
    if (!this.sandbox) {
      console.error(`[VercelProvider] writeFilePrimary: No active sandbox`);
      throw new Error('No active sandbox');
    }

    const fullPath = this.getFullPath(path);
    console.log(`[VercelProvider] Full path: ${fullPath}`);
    // Detect base64 content (used for images) vs regular text files
    const isBase64 = fullPath.includes('/images/') && !content.includes('\n') && /^[A-Za-z0-9+/=]+$/.test(content);
    const buffer = isBase64 ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf-8');

    console.log(`[VercelProvider] Calling sandbox.writeFiles for ${fullPath}`);
    await this.sandbox.writeFiles([{
      path: fullPath,
      content: buffer
    }]);
    console.log(`[VercelProvider] sandbox.writeFiles succeeded for ${fullPath}`);

    this.trackFile(path);
    console.log(`[VercelProvider] Tracked file: ${path}`);
  }

  async writeFile(path: string, content: string): Promise<void> {
    console.log(`[VercelProvider] writeFile called: ${path} (${content.length} chars)`);
    if (!this.sandbox) {
      console.error(`[VercelProvider] writeFile failed: No active sandbox`);
      throw new Error('No active sandbox');
    }

    try {
      console.log(`[VercelProvider] Calling writeFilePrimary for ${path}`);
      await this.writeFilePrimary(path, content);
      console.log(`[VercelProvider] writeFilePrimary succeeded for ${path}`);
    } catch (error: unknown) {
      console.error(`[VercelProvider] writeFilePrimary failed for ${path}:`, error);
      this.logger.error(`writeFiles failed for ${path}:`, error);
      const fullPath = this.getFullPath(path);
      console.log(`[VercelProvider] Falling back to shell write for ${fullPath}`);
      await this.writeFileFallback(fullPath, content);
      console.log(`[VercelProvider] Fallback write succeeded for ${path}`);
    }
  }

  // Write multiple files with Buffer support for binary files (images)
  async writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<void> {
    console.log(`[VercelProvider] writeFiles called: ${files.length} files`);
    if (!this.sandbox) {
      console.error(`[VercelProvider] writeFiles failed: No active sandbox`);
      throw new Error('No active sandbox');
    }

    try {
      // Convert to full paths and call SDK writeFiles
      const filesWithFullPaths = files.map(file => ({
        path: this.getFullPath(file.path),
        content: file.content
      }));

      console.log(`[VercelProvider] Calling sandbox.writeFiles for ${files.length} files`);
      await this.sandbox.writeFiles(filesWithFullPaths);
      console.log(`[VercelProvider] sandbox.writeFiles succeeded`);

      // Track all files
      for (const file of files) {
        this.trackFile(file.path);
      }
    } catch (error: unknown) {
      console.error(`[VercelProvider] writeFiles failed:`, error);
      this.logger.error(`writeFiles failed:`, error);
      throw error;
    }
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    const fullPath = this.getFullPath(path);
    const result = await this.executeCommand('cat', [fullPath]);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }

    return result.stdout;
  }

  async listFiles(directory?: string): Promise<string[]> {
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    const targetDir = directory || this.workingDirectory;
    const result = await this.executeCommand(
      'sh',
      ['-c', `find ${targetDir} -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/build/*" | sed "s|^${targetDir}/||"`]
    );

    if (result.exitCode !== 0) {
      return [];
    }

    return result.stdout.split('\n').filter((line: string) => line.trim() !== '');
  }

  async installPackages(packages: string[]): Promise<CommandResult> {
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    const maxRetries = 3;
    let lastResult: { stdout: string; stderr: string; exitCode: number } | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.info(`Installing packages (attempt ${attempt}/${maxRetries}): ${packages.join(', ')}`);

      const flags = process.env.NPM_FLAGS || '';
      const args = ['install'];
      if (flags) {
        args.push(...flags.split(' '));
      }
      args.push(...packages);

      const result = await this.executeCommand('npm', args, this.workingDirectory);
      lastResult = result;

      if (result.exitCode === 0) {
        this.logger.info('Package installation successful');

        // Restart Vite if configured and successful
        if (appConfig.packages.autoRestartVite) {
          await this.restartViteServer();
        }

        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          success: true
        };
      }

      // If failed but not last attempt, wait before retry
      if (attempt < maxRetries) {
        this.logger.warn(`Package installation failed, retrying in ${attempt * 2}s...`, result.stderr);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }

    // All retries failed
    this.logger.error('Package installation failed after all retries');
    return {
      stdout: lastResult?.stdout || '',
      stderr: lastResult?.stderr || 'Package installation failed after retries',
      exitCode: lastResult?.exitCode || 1,
      success: false
    };
  }

  protected async createDirectories(): Promise<void> {
    await this.executeCommand('mkdir', ['-p', `${this.workingDirectory}/src`]);
  }

  protected async installDependencies(): Promise<void> {
    try {
      const result = await this.executeCommand('npm', ['install'], this.workingDirectory);

      if (result.exitCode === 0) {
        this.logger.info('Dependencies installed successfully');
      } else {
        this.logger.warn('npm install had issues:', result.stderr);
      }
    } catch (error: unknown) {
      this.logger.error('npm install error:', error);

      // Try alternative approach
      try {
        const altResult = await this.executeCommand('sh', ['-c', 'npm install'], this.workingDirectory);
        if (altResult.exitCode === 0) {
          this.logger.info('Alternative npm install succeeded');
        } else {
          this.logger.warn('Alternative npm install also had issues:', altResult.stderr);
        }
      } catch (altError: unknown) {
        this.logger.error('Alternative npm install also failed:', altError);
      }
    }
  }

  protected async startViteServer(): Promise<void> {
    // Kill any existing Vite processes
    await this.killViteProcess();

    // Start Vite in background
    await this.executeCommand(
      'sh',
      ['-c', 'nohup npm run dev > /tmp/vite.log 2>&1 &'],
      this.workingDirectory
    );

    this.logger.info('Vite server started in background');

    // Wait for Vite to be ready
    await new Promise(resolve => setTimeout(resolve, appConfig.vercelSandbox.devServerStartupDelay));

    // NEW: Verify server is actually listening
    const isReady = await this.verifyDevServerReady();
    if (!isReady) {
      // Check the log for errors
      const logResult = await this.executeCommand('cat', ['/tmp/vite.log']);
      this.logger.error('Vite server failed to start. Log output:', logResult.stdout + logResult.stderr);
      throw new Error('Vite dev server failed to start - check logs at /tmp/vite.log');
    }

    this.logger.info('Vite server verified listening on port', appConfig.vercelSandbox.devPort);
  }

  async ensureViteServerReady(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    const isReady = await this.verifyDevServerReady();
    if (!isReady) {
      await this.startViteServer();
    }

    if (this.appSandboxId) {
      this.sandboxInfo = this.buildSandboxInfo(this.appSandboxId);
    }
  }

  /**
   * Verify the dev server is actually listening and responding
   */
  protected async verifyDevServerReady(): Promise<boolean> {
    const maxAttempts = 15;
    const delay = 1000;
    const port = appConfig.vercelSandbox.devPort;

    this.logger.info(`Verifying dev server is ready on port ${port}...`);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to connect to the dev server
        const result = await this.executeCommand(
          'sh',
          ['-c', `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} || echo "000"`]
        );

        const statusCode = result.stdout.trim();

        // 200 means server is ready, 000 means connection refused
        if (statusCode === '200' || statusCode === '403' || statusCode === '404') {
          this.logger.info(`Dev server ready (status: ${statusCode})`);
          return true;
        }

        // Check if process is still running
        const processCheck = await this.executeCommand('sh', ['-c', 'pgrep -f vite || echo "none"']);
        if (processCheck.stdout.trim() === 'none') {
          this.logger.error('Vite process not found');
          return false;
        }
      } catch (error) {
        // Not ready yet, continue waiting
        this.logger.debug(`Health check attempt ${i + 1}/${maxAttempts} failed, retrying...`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.logger.error(`Dev server failed to become ready after ${maxAttempts} attempts`);
    return false;
  }

  /**
   * Check if the sandbox is healthy and the dev server is responsive
   */
  async isHealthy(): Promise<boolean> {
    if (!this.sandbox) {
      return false;
    }

    try {
      // Quick check if sandbox is responsive
      const result = await this.executeCommand('echo', ['healthy']);
      if (result.exitCode !== 0) {
        return false;
      }

      // Check if dev server is listening
      return await this.verifyDevServerReady();
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  protected async killViteProcess(): Promise<void> {
    await this.executeCommand('sh', ['-c', 'pkill -f vite || true'], '/');
  }

  async terminate(): Promise<void> {
    if (this.sandbox) {
      try {
        await this.sandbox.stop();
      } catch (e: unknown) {
        this.logger.error('Failed to terminate sandbox:', e);
      }
      this.sandbox = null;
      this.sandboxInfo = null;
    }
  }
}
