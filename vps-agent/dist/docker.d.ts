import Docker from 'dockerode';
import type { VpsSandboxConfig, VpsSandboxInfo, VpsExecResult, VpsFileWrite } from './types';
import type { AgentStore } from './store';
export declare const docker: Docker;
export declare function createOrResumeSandbox(store: AgentStore, config: VpsSandboxConfig): Promise<VpsSandboxInfo>;
export declare function getSandboxInfo(store: AgentStore, sandboxId: string): Promise<VpsSandboxInfo | undefined>;
export declare function removeSandbox(store: AgentStore, sandboxId: string): Promise<void>;
export interface ExecOptions {
    cwd?: string;
    env?: Record<string, string>;
    detach?: boolean;
    timeoutSeconds?: number;
}
export declare function execInContainer(container: Docker.Container, command: string[], opts?: ExecOptions): Promise<VpsExecResult>;
export declare function writeFilesToContainer(container: Docker.Container, cwd: string, files: VpsFileWrite[]): Promise<number>;
export declare function readFileFromContainer(container: Docker.Container, cwd: string, filePath: string): Promise<{
    content: string;
    encoding: 'utf8' | 'base64';
}>;
export declare function listFilesInContainer(container: Docker.Container, cwd: string, dirPath: string): Promise<string[]>;
export declare function extendSandboxTimeout(store: AgentStore, sandboxId: string, durationMs: number): Promise<boolean>;
export declare function reconcileExistingContainers(store: AgentStore): Promise<void>;
export declare function getContainerForSandbox(sandboxId: string): Promise<Docker.Container | undefined>;
//# sourceMappingURL=docker.d.ts.map