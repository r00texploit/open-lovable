import { SandboxInfo, CommandResult, SandboxProviderConfig } from '../types';
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
    return { oidcToken: process.env.VERCEL_OIDC_TOKEN! };
  }
  return {};
}

export class VercelProvider extends BaseSandboxProvider {
  protected providerName: 'vercel' | 'e2b' = 'vercel';
  protected workingDirectory = '/vercel/sandbox';

  constructor(config: SandboxProviderConfig = {}, logger?: Logger) {
    super(config, logger, 'vercel');
  }

  async reconnect(sandboxId: string): Promise<SandboxInfo> {
    const Sandbox = await getVercelSandbox();
    const credentials = buildCredentials();
    this.sandbox = await Sandbox.get({ sandboxId, ...credentials });
    const sandboxUrl = this.sandbox.domain(appConfig.vercelSandbox.devPort);
    this.sandboxInfo = { sandboxId, url: sandboxUrl, provider: 'vercel', createdAt: new Date() };
    return this.sandboxInfo;
  }

  async createSandbox(): Promise<SandboxInfo> {
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

      const sandboxConfig: Record<string, unknown> = {
        timeout: appConfig.vercelSandbox.timeoutMs,
        runtime: appConfig.vercelSandbox.runtime,
        ports: [appConfig.vercelSandbox.devPort]
      };

      Object.assign(sandboxConfig, buildCredentials());

      this.sandbox = await Sandbox.create(sandboxConfig as Parameters<typeof Sandbox.create>[0]);

      const sandboxId = this.sandbox.sandboxId;
      const sandboxUrl = this.sandbox.domain(appConfig.vercelSandbox.devPort);

      this.sandboxInfo = {
        sandboxId,
        url: sandboxUrl,
        provider: 'vercel',
        createdAt: new Date()
      };

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
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    const fullPath = this.getFullPath(path);
    const buffer = Buffer.from(content, 'utf-8');

    await this.sandbox.writeFiles([{
      path: fullPath,
      content: buffer
    }]);

    this.trackFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('No active sandbox');
    }

    try {
      await this.writeFilePrimary(path, content);
    } catch (error: unknown) {
      this.logger.error(`writeFiles failed for ${path}:`, error);
      const fullPath = this.getFullPath(path);
      await this.writeFileFallback(fullPath, content);
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

    const flags = process.env.NPM_FLAGS || '';
    const args = ['install'];
    if (flags) {
      args.push(...flags.split(' '));
    }
    args.push(...packages);

    const result = await this.executeCommand('npm', args, this.workingDirectory);

    // Restart Vite if configured and successful
    if (result.exitCode === 0 && appConfig.packages.autoRestartVite) {
      await this.restartViteServer();
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      success: result.exitCode === 0
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
