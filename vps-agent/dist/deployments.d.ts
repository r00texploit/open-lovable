import type { VpsDeploymentPayload } from './types';
import type { AgentStore } from './store';
export declare function getSiteDir(siteId: string): string;
export declare function createOrUpdateDeployment(store: AgentStore, payload: VpsDeploymentPayload): Promise<void>;
export declare function removeDeployment(store: AgentStore, siteId: string): Promise<void>;
//# sourceMappingURL=deployments.d.ts.map