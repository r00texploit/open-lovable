import {
  SandboxInfo,
  CommandResult,
  SandboxCreateOptions,
  SandboxProviderConfig,
} from '../types';
import { BaseSandboxProvider, Logger } from './base-provider';
import { appConfig } from '@/config/app.config';
import type {
  VpsSandboxConfig,
  VpsSandboxInfo,
  VpsExecResult,
  VpsFileWrite,
} from './vps-types';

interface AgentError {
  message: string;
  code?: string;
}

export class VpsProvider extends BaseSandboxProvider {
  protected providerName: 'vercel' | 'e2b' | 'vps' = 'vps';
  protected workingDirectory = appConfig.vps.workingDirectory;
  private agentUrl: string;
  private agentToken: string;
  private baseDomain: string;
  private timeoutMinutes: number;
  private devPort: number;
  private appSandboxId: string | null = null;

  constructor(config: SandboxProviderConfig = {}, logger?: Logger) {
    super(config, logger, 'vps');
    const vps = config.vps || appConfig.vps;
    if (!vps.agentUrl || !vps.agentToken) {
      throw new Error('VpsProvider requires VPS_AGENT_URL and VPS_AGENT_TOKEN');
    }
    this.agentUrl = vps.agentUrl.replace(/\/$/, '');
    this.agentToken = vps.agentToken;
    this.baseDomain = vps.baseDomain || appConfig.vps.baseDomain;
    this.timeoutMinutes = vps.timeoutMinutes || appConfig.vps.timeoutMinutes;
    this.devPort = vps.devPort || appConfig.vps.devPort;
  }

  private async agentFetch<T>(
    pathname: string,
    init?: RequestInit
  ): Promise<T> {
    const url = `${this.agentUrl}${pathname}`;
    const requestTimeoutMs = Number(process.env.VPS_AGENT_REQUEST_TIMEOUT_MS) || 330_000;
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.agentToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
      signal: init?.signal || AbortSignal.timeout(requestTimeoutMs),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (payload as AgentError).message ||
        (payload as { error?: { message?: string } }).error?.message ||
        `VPS agent request failed: ${response.status}`;
      throw new Error(message);
    }
    return payload as T;
  }

  private buildSandboxUrl(subdomain?: string, customDomain?: string) {
    if (customDomain) {
      return `https://${customDomain}`;
    }
    if (subdomain) {
      return `https://${subdomain}.${this.baseDomain}`;
    }
    return `https://${this.appSandboxId}.${this.baseDomain}`;
  }

  private mapAgentInfo(info: VpsSandboxInfo): SandboxInfo {
    return {
      sandboxId: info.sandboxId,
      url: info.url,
      provider: 'vps',
      createdAt: new Date(info.createdAt),
      sandboxName: info.sandboxName,
      runtimeStatus: info.status,
      containerId: info.containerId,
      host: info.host,
      port: info.port,
    };
  }

  async reconnect(sandboxName: string, sandboxId: string = sandboxName): Promise<SandboxInfo> {
    this.appSandboxId = sandboxId;
    const info = await this.agentFetch<VpsSandboxInfo>(`/sandboxes/${encodeURIComponent(sandboxId)}`);
    this.sandbox = { id: sandboxId };
    this.sandboxInfo = this.mapAgentInfo(info);
    await this.ensureViteServerReady();
    return this.sandboxInfo;
  }

  async createSandbox(options: SandboxCreateOptions = {}): Promise<SandboxInfo> {
    try {
      // Stop any existing sandbox held by this provider instance
      if (this.sandbox) {
        try {
          await this.terminate();
        } catch (e) {
          this.logger.error('Failed to terminate existing VPS sandbox:', e);
        }
      }

      this.clearTrackedFiles();

      const appSandboxId = options.appSandboxId || options.sandboxName || `sb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      const sandboxName = options.sandboxName || appSandboxId;
      this.appSandboxId = appSandboxId;

      const body: VpsSandboxConfig = {
        sandboxName,
        sandboxId: appSandboxId,
        subdomain: options.subdomain,
        customDomain: options.customDomain,
        baseDomain: this.baseDomain,
        // The provider installs the Vite template itself via BaseSandboxProvider
        // so the agent only needs to create/resume the container.
        setupOnCreate: false,
        timeoutMinutes: this.timeoutMinutes,
      };

      const info = await this.agentFetch<VpsSandboxInfo>('/sandboxes', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      this.sandbox = { id: appSandboxId, containerId: info.containerId };
      this.sandboxInfo = this.mapAgentInfo({
        ...info,
        url: this.buildSandboxUrl(options.subdomain, options.customDomain),
      });

      if (options.setupOnCreate ?? true) {
        await this.setupViteApp();
      }

      return this.sandboxInfo;
    } catch (error) {
      this.logger.error('Error creating VPS sandbox:', error);
      throw error;
    }
  }

  async extendTimeout(durationMs: number): Promise<boolean> {
    if (!this.appSandboxId) return false;
    try {
      await this.agentFetch<{ extended: boolean }>(
        `/sandboxes/${encodeURIComponent(this.appSandboxId)}/extend-timeout`,
        {
          method: 'POST',
          body: JSON.stringify({ durationMs }),
        }
      );
      return true;
    } catch (error: unknown) {
      this.logger.warn('Could not extend VPS sandbox timeout:', (error as Error)?.message || error);
      return false;
    }
  }

  protected async executeCommand(
    cmd: string,
    args?: string[],
    cwd?: string,
    env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (!this.appSandboxId) {
      throw new Error('No active VPS sandbox');
    }

    const fullCmd = args?.length ? `${cmd} ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}` : cmd;

    const result = await this.agentFetch<VpsExecResult>(
      `/sandboxes/${encodeURIComponent(this.appSandboxId)}/exec`,
      {
        method: 'POST',
        body: JSON.stringify({
          command: fullCmd,
          cwd: cwd || this.workingDirectory,
          env: env || {},
        }),
      }
    );

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode || 0,
    };
  }

  async runCommand(command: string): Promise<CommandResult> {
    try {
      const result = await this.executeCommand('bash', ['-c', command]);
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        success: result.exitCode === 0,
      };
    } catch (error: unknown) {
      return {
        stdout: '',
        stderr: (error as Error).message || 'Command failed',
        exitCode: 1,
        success: false,
      };
    }
  }

  protected async writeFilePrimary(path: string, content: string): Promise<void> {
    await this.writeFiles([{ path, content: Buffer.from(content, 'utf-8') }]);
    this.trackFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      await this.writeFilePrimary(path, content);
    } catch (error: unknown) {
      this.logger.error(`writeFile failed for ${path}:`, error);
      const fullPath = this.getFullPath(path);
      await this.writeFileFallback(fullPath, content);
    }
  }

  async writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<void> {
    if (!this.appSandboxId) {
      throw new Error('No active VPS sandbox');
    }

    const payload: VpsFileWrite[] = files.map((file) => {
      const isBinary = this.isBinaryPath(file.path);
      return {
        path: this.getFullPath(file.path),
        content: isBinary ? file.content.toString('base64') : file.content.toString('utf-8'),
        encoding: isBinary ? 'base64' : 'utf8',
      };
    });

    await this.agentFetch<{ written: number }>(
      `/sandboxes/${encodeURIComponent(this.appSandboxId)}/files`,
      {
        method: 'POST',
        body: JSON.stringify({ files: payload }),
      }
    );

    for (const file of files) {
      this.trackFile(file.path);
    }
  }

  private isBinaryPath(path: string): boolean {
    return /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|mp3|mp4|webm|pdf)$/i.test(path);
  }

  async readFile(path: string): Promise<string> {
    if (!this.appSandboxId) {
      throw new Error('No active VPS sandbox');
    }
    const fullPath = this.getFullPath(path);
    const result = await this.agentFetch<{ content: string; encoding: 'utf8' | 'base64' }>(
      `/sandboxes/${encodeURIComponent(this.appSandboxId)}/files?path=${encodeURIComponent(fullPath)}`
    );
    return result.encoding === 'base64'
      ? Buffer.from(result.content, 'base64').toString('utf-8')
      : result.content;
  }

  async listFiles(directory?: string): Promise<string[]> {
    if (!this.appSandboxId) {
      throw new Error('No active VPS sandbox');
    }
    const targetDir = directory || this.workingDirectory;
    const result = await this.agentFetch<{ files: string[] }>(
      `/sandboxes/${encodeURIComponent(this.appSandboxId)}/files?dir=${encodeURIComponent(targetDir)}`
    );
    return result.files || [];
  }

  async installPackages(packages: string[]): Promise<CommandResult> {
    const maxRetries = 3;
    let lastResult: CommandResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.info(`Installing packages (attempt ${attempt}/${maxRetries}): ${packages.join(', ')}`);
      const flags = process.env.NPM_FLAGS || '';
      const args = ['install'];
      if (flags) args.push(...flags.split(' '));
      args.push(...packages);

      const result = await this.runCommand(`npm ${args.join(' ')}`);
      lastResult = result;

      if (result.success) {
        this.logger.info('Package installation successful');
        if (appConfig.packages.autoRestartVite) {
          await this.restartViteServer();
        }
        return result;
      }

      if (attempt < maxRetries) {
        this.logger.warn(`Package installation failed, retrying in ${attempt * 2}s...`, result.stderr);
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }

    this.logger.error('Package installation failed after all retries');
    return (
      lastResult || {
        stdout: '',
        stderr: 'Package installation failed after retries',
        exitCode: 1,
        success: false,
      }
    );
  }

  protected async createDirectories(): Promise<void> {
    await this.executeCommand('mkdir', ['-p', `${this.workingDirectory}/src`]);
  }

  protected async installDependencies(): Promise<void> {
    const result = await this.runCommand('npm install');
    if (!result.success) {
      this.logger.warn('npm install had issues:', result.stderr);
    }
  }

  protected async startViteServer(): Promise<void> {
    await this.killViteProcess();
    await this.runCommand('nohup npm run dev > /tmp/vite.log 2>&1 & echo $! > /tmp/vite.pid');
    this.logger.info('Vite server started in background');
    await new Promise((resolve) => setTimeout(resolve, appConfig.vps.devServerStartupDelay || 7000));
    const isReady = await this.verifyDevServerReady();
    if (!isReady) {
      const log = await this.runCommand('cat /tmp/vite.log');
      this.logger.error('Vite server failed to start. Log output:', log.stdout + log.stderr);
      throw new Error('Vite dev server failed to start - check logs at /tmp/vite.log');
    }
    this.logger.info('Vite server verified listening on port', this.devPort);
  }

  async ensureViteServerReady(): Promise<void> {
    const isReady = await this.verifyDevServerReady();
    if (!isReady) {
      await this.startViteServer();
    }
    if (this.appSandboxId && this.sandboxInfo) {
      this.sandboxInfo = { ...this.sandboxInfo };
    }
  }

  protected async verifyDevServerReady(): Promise<boolean> {
    const maxAttempts = 15;
    const delay = 1000;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.runCommand(
          `node -e "fetch('http://127.0.0.1:${this.devPort}').then(r=>{console.log(r.status)}).catch(()=>{console.log('000')})"`
        );
        const statusCode = result.stdout.trim();
        if (['200', '403', '404'].includes(statusCode)) {
          this.logger.info(`Dev server ready (status: ${statusCode})`);
          return true;
        }
        const processCheck = await this.runCommand(
          'test -s /tmp/vite.pid && kill -0 "$(cat /tmp/vite.pid)" 2>/dev/null && echo running || echo none'
        );
        if (!processCheck.stdout.includes('running')) {
          this.logger.error('Vite process not found');
          return false;
        }
      } catch (error) {
        this.logger.debug(`Health check attempt ${i + 1}/${maxAttempts} failed, retrying...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.logger.error(`Dev server failed to become ready after ${maxAttempts} attempts`);
    return false;
  }

  protected async killViteProcess(): Promise<void> {
    await this.runCommand(
      'if test -s /tmp/vite.pid; then kill "$(cat /tmp/vite.pid)" 2>/dev/null || true; fi; rm -f /tmp/vite.pid'
    );
  }

  async terminate(): Promise<void> {
    if (!this.appSandboxId) return;
    try {
      await this.agentFetch<{ deleted: boolean }>(
        `/sandboxes/${encodeURIComponent(this.appSandboxId)}`,
        { method: 'DELETE' }
      );
    } catch (e: unknown) {
      this.logger.error('Failed to terminate VPS sandbox:', e);
    } finally {
      this.sandbox = null;
      this.sandboxInfo = null;
      this.appSandboxId = null;
    }
  }

  isAlive(): boolean {
    return !!this.sandbox && !!this.appSandboxId;
  }
}
