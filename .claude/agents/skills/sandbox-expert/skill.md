# Sandbox Expert Skill

## Architecture

### Provider Pattern
```typescript
// lib/sandbox/types.ts
export interface SandboxProvider {
  createSandbox(template?: string): Promise<SandboxInfo>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  runCommand(command: string): Promise<CommandResult>;
  getPort(): number;
  destroy(): Promise<void>;
}

export interface SandboxInfo {
  id: string;
  url: string;
  port: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

### Factory Implementation
```typescript
// lib/sandbox/factory.ts
import { VercelProvider } from './providers/vercel-provider';
import { E2BProvider } from './providers/e2b-provider';
import type { SandboxProvider } from './types';

export class SandboxFactory {
  static create(): SandboxProvider {
    const provider = process.env.SANDBOX_PROVIDER;
    
    switch (provider) {
      case 'vercel':
        return new VercelProvider();
      case 'e2b':
        return new E2BProvider();
      default:
        throw new Error(`Unknown sandbox provider: ${provider}`);
    }
  }
}
```

## Vercel Sandbox Provider

### Implementation
```typescript
// lib/sandbox/providers/vercel-provider.ts
import { VercelSandbox } from '@vercel/sandbox';

export class VercelProvider implements SandboxProvider {
  private sandbox: VercelSandbox | null = null;
  private sandboxId: string = '';

  async createSandbox(template: string = 'vite-react'): Promise<SandboxInfo> {
    this.sandbox = new VercelSandbox({
      template,
      env: {
        NODE_ENV: 'development',
      },
    });

    await this.sandbox.create();
    this.sandboxId = this.sandbox.id;

    return {
      id: this.sandboxId,
      url: this.sandbox.getPreviewUrl(),
      port: 3000,
    };
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) throw new Error('Sandbox not initialized');
    await this.sandbox.fs.writeFile(path, content);
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) throw new Error('Sandbox not initialized');
    return this.sandbox.fs.readFile(path, 'utf-8');
  }

  async runCommand(command: string): Promise<CommandResult> {
    if (!this.sandbox) throw new Error('Sandbox not initialized');
    const result = await this.sandbox.shell.execute(command);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  getPort(): number {
    return 3000;
  }

  async destroy(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.destroy();
      this.sandbox = null;
    }
  }
}
```

## E2B Sandbox Provider

### Implementation
```typescript
// lib/sandbox/providers/e2b-provider.ts
import { Sandbox } from '@e2b/code-interpreter';

export class E2BProvider implements SandboxProvider {
  private sandbox: Sandbox | null = null;
  private sandboxId: string = '';

  async createSandbox(template: string = 'vite-react'): Promise<SandboxInfo> {
    this.sandbox = await Sandbox.create({
      template,
      timeout: 600000, // 10 minutes
    });

    this.sandboxId = this.sandbox.id;

    return {
      id: this.sandboxId,
      url: `https://${this.sandboxId}-5173.e2b.dev`,
      port: 5173,
    };
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) throw new Error('Sandbox not initialized');
    await this.sandbox.filesystem.writeFile(path, content);
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) throw new Error('Sandbox not initialized');
    return this.sandbox.filesystem.readFile(path);
  }

  async runCommand(command: string): Promise<CommandResult> {
    if (!this.sandbox) throw new Error('Sandbox not initialized');
    const result = await this.sandbox.commands.run(command);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || 0,
    };
  }

  getPort(): number {
    return 5173;
  }

  async destroy(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.kill();
      this.sandbox = null;
    }
  }
}
```

## Sandbox Manager

### Singleton Pattern
```typescript
// lib/sandbox/sandbox-manager.ts
import { SandboxFactory } from './factory';
import type { SandboxProvider, SandboxInfo } from './types';

class SandboxManager {
  private sandbox: SandboxProvider | null = null;
  private info: SandboxInfo | null = null;

  async create(): Promise<SandboxInfo> {
    if (this.sandbox) {
      return this.info!;
    }

    this.sandbox = SandboxFactory.create();
    this.info = await this.sandbox.createSandbox();
    
    return this.info;
  }

  getSandbox(): SandboxProvider {
    if (!this.sandbox) {
      throw new Error('Sandbox not created');
    }
    return this.sandbox;
  }

  getInfo(): SandboxInfo {
    if (!this.info) {
      throw new Error('Sandbox not created');
    }
    return this.info;
  }

  async destroy(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.destroy();
      this.sandbox = null;
      this.info = null;
    }
  }
}

export const sandboxManager = new SandboxManager();
```

## Error Handling

### Sandbox Errors
```typescript
class SandboxError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}

// Usage
async function safeSandboxOperation() {
  try {
    await sandbox.writeFile('test.js', 'console.log("test")');
  } catch (error) {
    throw new SandboxError(
      'Failed to write file to sandbox',
      'FILE_WRITE_ERROR',
      error as Error
    );
  }
}
```

## Best Practices

1. **Always cleanup sandboxes** - Use finally blocks or cleanup hooks
2. **Handle timeouts** - Sandboxes have limited lifespans
3. **Validate file paths** - Prevent path traversal attacks
4. **Limit command execution** - Whitelist allowed commands
5. **Monitor resource usage** - Track sandbox creation/destruction

## Project-Specific: Noeron
- Supports both Vercel and E2B sandboxes
- Template: Vite React
- File changes tracked in `global.existingFiles`
- Sandbox port: 3000 (Vercel) or 5173 (E2B)
- Live preview via WebSocket updates
