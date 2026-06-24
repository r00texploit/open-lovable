import { SandboxInfo, CommandResult, SandboxProviderConfig } from '../types';
import { BaseSandboxProvider, Logger } from './base-provider';
import { appConfig } from '@/config/app.config';

// Dynamic import for E2B SDK to avoid client-side bundling
async function getE2BSandbox() {
  const { Sandbox } = await import('@e2b/code-interpreter');
  return Sandbox;
}

// Type for E2B SDK response
interface E2BRunResult {
  logs: {
    stdout: string[];
    stderr: string[];
  };
  error?: Error;
}

// Type for E2B Sandbox
interface E2BSandboxInstance {
  sandboxId: string;
  getHost(port: number): string;
  setTimeout?(ms: number): Promise<void>;
  runCode(code: string): Promise<E2BRunResult>;
  files?: {
    write(path: string, content: Buffer): Promise<void>;
  };
  kill(): Promise<void>;
}

export class E2BProvider extends BaseSandboxProvider {
  protected providerName: 'vercel' | 'e2b' = 'e2b';
  protected workingDirectory = '/home/user/app';
  private e2bSandbox: E2BSandboxInstance | null = null;

  constructor(config: SandboxProviderConfig = {}, logger?: Logger) {
    super(config, logger, 'e2b');
  }

  /**
   * Attempt to reconnect to an existing E2B sandbox
   * Note: E2B SDK doesn't directly support reconnection
   */
  async reconnect(_sandboxId: string): Promise<boolean> {
    this.logger.warn('E2B sandbox reconnection is not supported');
    return false;
  }

  async createSandbox(): Promise<SandboxInfo> {
    try {
      const Sandbox = await getE2BSandbox();

      // Kill existing sandbox if any
      if (this.sandbox) {
        try {
          await this.e2bSandbox?.kill();
        } catch (e: unknown) {
          this.logger.error('Failed to close existing sandbox:', e);
        }
        this.sandbox = null;
        this.e2bSandbox = null;
      }

      // Clear existing files tracking
      this.clearTrackedFiles();

      // Create base sandbox
      this.e2bSandbox = await Sandbox.create({
        apiKey: this.config.e2b?.apiKey || process.env.E2B_API_KEY,
        timeoutMs: this.config.e2b?.timeoutMs || appConfig.e2b.timeoutMs
      }) as unknown as E2BSandboxInstance;

      const sandboxId = this.e2bSandbox.sandboxId || Date.now().toString();
      const host = this.e2bSandbox.getHost(appConfig.e2b.vitePort);

      this.sandboxInfo = {
        sandboxId,
        url: `https://${host}`,
        provider: 'e2b',
        createdAt: new Date()
      };

      // Set extended timeout on the sandbox instance if method available
      if (typeof this.e2bSandbox.setTimeout === 'function') {
        await this.e2bSandbox.setTimeout(appConfig.e2b.timeoutMs);
      }

      // Store reference for base class compatibility
      this.sandbox = this.e2bSandbox as unknown as typeof this.sandbox;

      return this.sandboxInfo;

    } catch (error: unknown) {
      this.logger.error('Error creating sandbox:', error);
      throw error;
    }
  }

  async extendTimeout(durationMs: number): Promise<boolean> {
    if (!this.e2bSandbox || typeof this.e2bSandbox.setTimeout !== 'function') {
      return false;
    }
    try {
      // E2B's setTimeout resets the remaining lifetime from now
      await this.e2bSandbox.setTimeout(durationMs);
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
    _env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    const fullCommand = args ? `${cmd} ${args.join(' ')}` : cmd;
    const workingDir = cwd || this.workingDirectory;

    const result = await this.e2bSandbox.runCode(`
import subprocess
import os

os.chdir('${workingDir}')
result = subprocess.run(${JSON.stringify(fullCommand.split(' '))},
                    capture_output=True,
                    text=True,
                    shell=False)

print("STDOUT:")
print(result.stdout)
if result.stderr:
    print("\\nSTDERR:")
    print(result.stderr)
print(f"\\nReturn code: {result.returncode}")
    `);

    const stdout = result.logs.stdout.join('\n');
    const stderr = result.logs.stderr.join('\n');

    return {
      stdout,
      stderr,
      exitCode: result.error ? 1 : 0
    };
  }

  async runCommand(command: string): Promise<CommandResult> {
    try {
      const result = await this.executeCommand(command);

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
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    const fullPath = this.getFullPath(path);

    // Use the E2B filesystem API if available
    if (this.e2bSandbox.files && typeof this.e2bSandbox.files.write === 'function') {
      await this.e2bSandbox.files.write(fullPath, Buffer.from(content));
    } else {
      // Fallback to Python code execution
      await this.e2bSandbox.runCode(`
import os

# Ensure directory exists
dir_path = os.path.dirname("${fullPath}")
os.makedirs(dir_path, exist_ok=True)

# Write file
with open("${fullPath}", 'w') as f:
    f.write(${JSON.stringify(content)})
print(f"✓ Written: ${fullPath}")
      `);
    }

    this.trackFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    await this.writeFilePrimary(path, content);
  }

  async readFile(path: string): Promise<string> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    const fullPath = this.getFullPath(path);

    const result = await this.e2bSandbox.runCode(`
with open("${fullPath}", 'r') as f:
    content = f.read()
print(content)
    `);

    return result.logs.stdout.join('\n');
  }

  async listFiles(directory: string = '/home/user/app'): Promise<string[]> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    const result = await this.e2bSandbox.runCode(`
import os
import json

def list_files(path):
    files = []
    for root, dirs, filenames in os.walk(path):
        # Skip node_modules and .git
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '.next', 'dist', 'build']]
        for filename in filenames:
            rel_path = os.path.relpath(os.path.join(root, filename), path)
            files.append(rel_path)
    return files

files = list_files("${directory}")
print(json.dumps(files))
    `);

    try {
      return JSON.parse(result.logs.stdout.join(''));
    } catch {
      return [];
    }
  }

  async installPackages(packages: string[]): Promise<CommandResult> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    const packageList = packages.join(' ');
    const flags = appConfig.packages.useLegacyPeerDeps ? '--legacy-peer-deps' : '';

    const result = await this.e2bSandbox.runCode(`
import subprocess
import os

os.chdir('${this.workingDirectory}')

# Install packages
result = subprocess.run(
    ['npm', 'install', ${flags ? `'${flags}',` : ''} ${packages.map(p => `'${p}'`).join(', ')}],
    capture_output=True,
    text=True
)

print("STDOUT:")
print(result.stdout)
if result.stderr:
    print("\\nSTDERR:")
    print(result.stderr)
print(f"\\nReturn code: {result.returncode}")
    `);

    const output = result.logs.stdout.join('\n');
    const stderr = result.logs.stderr.join('\n');

    // Restart Vite if configured
    if (appConfig.packages.autoRestartVite && !result.error) {
      await this.restartViteServer();
    }

    return {
      stdout: output,
      stderr,
      exitCode: result.error ? 1 : 0,
      success: !result.error
    };
  }

  protected async createDirectories(): Promise<void> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    await this.e2bSandbox.runCode(`
import os
os.makedirs('${this.workingDirectory}/src', exist_ok=True)
    `);
  }

  protected async installDependencies(): Promise<void> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    const result = await this.e2bSandbox.runCode(`
import subprocess

print('Installing npm packages...')
result = subprocess.run(
    ['npm', 'install'],
    cwd='${this.workingDirectory}',
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print('✓ Dependencies installed successfully')
else:
    print(f'⚠ Warning: npm install had issues: {result.stderr}')
    `);

    const exitCode = result.logs.stdout.some(line => line.includes('✓')) ? 0 : 1;
    if (exitCode !== 0) {
      this.logger.warn('npm install had issues:', result.logs.stderr.join('\n'));
    }
  }

  protected async startViteServer(): Promise<void> {
    if (!this.e2bSandbox) {
      throw new Error('No active sandbox');
    }

    await this.killViteProcess();

    await this.e2bSandbox.runCode(`
import subprocess
import os
import time

os.chdir('${this.workingDirectory}')

# Kill any existing Vite processes
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
time.sleep(1)

# Start Vite dev server
env = os.environ.copy()
env['FORCE_COLOR'] = '0'

process = subprocess.Popen(
    ['npm', 'run', 'dev'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    env=env
)

print(f'✓ Vite dev server started with PID: {process.pid}')
print('Waiting for server to be ready...')
    `);

    this.logger.info('Vite server started in background');

    // Wait for Vite to be ready
    await new Promise(resolve => setTimeout(resolve, appConfig.e2b.viteStartupDelay));
  }

  protected async killViteProcess(): Promise<void> {
    if (!this.e2bSandbox) {
      return;
    }

    await this.e2bSandbox.runCode(`
import subprocess
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
    `);
  }

  async terminate(): Promise<void> {
    if (this.e2bSandbox) {
      try {
        await this.e2bSandbox.kill();
      } catch (e: unknown) {
        this.logger.error('Failed to terminate sandbox:', e);
      }
      this.e2bSandbox = null;
      this.sandbox = null;
      this.sandboxInfo = null;
    }
  }
}
