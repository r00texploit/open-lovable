import type { AgentStore } from './store';
import type { VpsRouteEntry, VpsSandboxInfo } from './types';
export declare function addSandboxRoutes(store: AgentStore, info: VpsSandboxInfo, baseDomain: string, subdomain?: string, _customDomain?: string): void;
export declare function removeSandboxRoutes(store: AgentStore, sandboxId: string): void;
export declare function addDeploymentRoutes(store: AgentStore, siteId: string, subdomain: string, _customDomain: string | null | undefined, siteDir: string, baseDomain: string): void;
export declare function removeDeploymentRoutes(store: AgentStore, siteId: string): void;
export declare function getRoutes(store: AgentStore): VpsRouteEntry[];
export declare function addDomainRoute(store: AgentStore, siteId: string, domain: string, verificationToken: string): boolean;
export declare function isRouteAuthorized(route: VpsRouteEntry, baseDomain: string): boolean;
export declare function refreshDomainRouteAuthorization(route: VpsRouteEntry): void;
export declare function removeDomainRoute(store: AgentStore, domain: string): boolean;
//# sourceMappingURL=routes.d.ts.map