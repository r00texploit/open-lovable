import type { VpsSandboxInfo, VpsRouteEntry, VpsDeploymentRecord } from './types';
export declare class AgentStore {
    sandboxes: Map<string, VpsSandboxInfo>;
    deployments: Map<string, VpsDeploymentRecord>;
    routes: VpsRouteEntry[];
    private saveQueue;
    private readonly dataDir;
    private readonly stateFile;
    constructor(dataDir?: string);
    private ensureDir;
    load(): Promise<void>;
    save(): Promise<void>;
    setSandbox(info: VpsSandboxInfo): void;
    getSandbox(sandboxId: string): VpsSandboxInfo | undefined;
    deleteSandbox(sandboxId: string): void;
    setDeployment(siteId: string, payload: VpsDeploymentRecord): void;
    getDeployment(siteId: string): VpsDeploymentRecord | undefined;
    deleteDeployment(siteId: string): void;
    get activeSandboxes(): number;
    get activeDeployments(): number;
}
//# sourceMappingURL=store.d.ts.map