/**
 * Shared type shapes for the VPS agent.
 * These mirror /home/halim/open-lovable-review/lib/sandbox/providers/vps-types.ts
 * so the agent can be built independently.
 */
export interface VpsSandboxConfig {
    /** Human-readable name for the container (must be DNS-safe). */
    sandboxName: string;
    /** Stable ID used by the app as the primary key. */
    sandboxId: string;
    /** Site subdomain to expose, e.g. "my-site". */
    subdomain?: string;
    /** Optional custom domain to route to this sandbox. */
    customDomain?: string;
    /** Base domain for preview URLs (e.g. "noeron.net"). */
    baseDomain: string;
    /** Whether to install the Vite template and start the dev server. */
    setupOnCreate?: boolean;
    /** Timeout in minutes before the sandbox is considered idle. */
    timeoutMinutes?: number;
}
export interface VpsSandboxInfo {
    sandboxId: string;
    sandboxName: string;
    url: string;
    containerId: string;
    host: string;
    port: number;
    status: 'creating' | 'running' | 'paused' | 'error' | 'terminated';
    createdAt: string;
    expiresAt?: string;
}
export interface VpsExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export interface VpsFileWrite {
    path: string;
    /** Base64-encoded content (text or binary). */
    content: string;
    /** Whether content is base64-encoded binary. Default false (utf8 text). */
    encoding?: 'base64' | 'utf8';
}
export interface VpsDeploymentPayload {
    siteId: string;
    subdomain: string;
    customDomain?: string | null;
    files: VpsFileWrite[];
}
export type VpsDeploymentRecord = Omit<VpsDeploymentPayload, 'files'> & {
    releaseDir: string;
    deployedAt: string;
};
export interface VpsRouteEntry {
    /** Hostname to match (e.g. "my-site.noeron.net" or "custom.com"). */
    host: string;
    /** Where to send traffic. */
    target: {
        type: 'container' | 'static';
        /** For containers: "host:port". For static: absolute path to directory. */
        value: string;
    };
    sandboxId?: string;
    siteId?: string;
    /** Present only after the control plane has verified custom-domain ownership. */
    domainAuthorizationVersion?: number;
    /** DNS TXT challenge, kept only in the private agent state. */
    domainVerificationToken?: string;
    /** Custom-domain routes fail closed unless DNS ownership is refreshed. */
    domainAuthorizationExpiresAt?: string;
}
export interface VpsHealthStatus {
    status: 'ok' | 'degraded' | 'error';
    version: string;
    activeSandboxes: number;
    activeDeployments: number;
}
//# sourceMappingURL=types.d.ts.map