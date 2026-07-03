export interface SandboxFile {
  path: string;
  content: string;
  lastModified?: number;
}

export interface SandboxInfo {
  sandboxId: string;
  url: string;
  provider: 'e2b' | 'vercel';
  createdAt: Date;
  sandboxName?: string;
  runtimeStatus?: string;
  currentSnapshotId?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface SandboxProviderConfig {
  e2b?: {
    apiKey: string;
    timeoutMs?: number;
    template?: string;
  };
  vercel?: {
    teamId?: string;
    projectId?: string;
    token?: string;
    authMethod?: 'oidc' | 'pat';
  };
}

export interface SandboxCreateOptions {
  appSandboxId?: string;
  sandboxName?: string;
  setupOnCreate?: boolean;
}

export abstract class SandboxProvider {
  protected config: SandboxProviderConfig;
  protected sandbox: any;
  protected sandboxInfo: SandboxInfo | null = null;

  constructor(config: SandboxProviderConfig) {
    this.config = config;
  }

  abstract createSandbox(options?: SandboxCreateOptions): Promise<SandboxInfo>;
  abstract runCommand(command: string): Promise<CommandResult>;
  abstract writeFile(path: string, content: string): Promise<void>;
  abstract readFile(path: string): Promise<string>;
  abstract listFiles(directory?: string): Promise<string[]>;
  abstract installPackages(packages: string[]): Promise<CommandResult>;
  abstract getSandboxUrl(): string | null;
  abstract getSandboxInfo(): SandboxInfo | null;
  abstract terminate(): Promise<void>;
  abstract isAlive(): boolean;

  // Write multiple files with binary support (Buffer required for binary files)
  // Use this for images and other binary assets
  abstract writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<void>;
  
  // Optional methods that providers can override

  // Extend the sandbox lifetime by durationMs. Returns false when the
  // provider doesn't support extension or the plan's maximum duration
  // has been reached.
  async extendTimeout(durationMs: number): Promise<boolean> {
    void durationMs;
    return false;
  }

  async setupViteApp(): Promise<void> {
    // Default implementation for setting up a Vite React app
    throw new Error('setupViteApp not implemented for this provider');
  }
  
  async restartViteServer(): Promise<void> {
    // Default implementation for restarting Vite
    throw new Error('restartViteServer not implemented for this provider');
  }

  async ensureViteServerReady(): Promise<void> {
    await this.restartViteServer();
  }
}
