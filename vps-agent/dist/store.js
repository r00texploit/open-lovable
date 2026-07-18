"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class AgentStore {
    sandboxes = new Map();
    deployments = new Map();
    routes = [];
    saveQueue = Promise.resolve();
    dataDir;
    stateFile;
    constructor(dataDir = process.env.VPS_DATA_DIR ?? '/data/vps-agent') {
        this.dataDir = dataDir;
        this.stateFile = path_1.default.join(dataDir, 'state.json');
    }
    async ensureDir() {
        await promises_1.default.mkdir(this.dataDir, { recursive: true });
    }
    async load() {
        try {
            await this.ensureDir();
            const raw = await promises_1.default.readFile(this.stateFile, 'utf8');
            const state = JSON.parse(raw);
            this.sandboxes = new Map(Object.entries(state.sandboxes ?? {}));
            this.routes = state.routes ?? [];
            this.deployments = new Map(Object.entries(state.deployments ?? {}).map(([siteId, value]) => {
                const route = this.routes.find((candidate) => candidate.siteId === siteId && candidate.target.type === 'static');
                return [siteId, {
                        siteId,
                        subdomain: value.subdomain,
                        customDomain: value.customDomain,
                        releaseDir: value.releaseDir || route?.target.value || '',
                        deployedAt: value.deployedAt || new Date(0).toISOString(),
                    }];
            }));
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }
    async save() {
        this.saveQueue = this.saveQueue.then(async () => {
            await this.ensureDir();
            const state = {
                sandboxes: Object.fromEntries(this.sandboxes),
                deployments: Object.fromEntries(this.deployments),
                routes: this.routes
            };
            const temporary = `${this.stateFile}.${process.pid}.tmp`;
            await promises_1.default.writeFile(temporary, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
            await promises_1.default.rename(temporary, this.stateFile);
        });
        return this.saveQueue;
    }
    setSandbox(info) {
        this.sandboxes.set(info.sandboxId, info);
        this.save().catch((err) => console.error('Failed to save state:', err));
    }
    getSandbox(sandboxId) {
        return this.sandboxes.get(sandboxId);
    }
    deleteSandbox(sandboxId) {
        this.sandboxes.delete(sandboxId);
        this.save().catch((err) => console.error('Failed to save state:', err));
    }
    setDeployment(siteId, payload) {
        this.deployments.set(siteId, payload);
        this.save().catch((err) => console.error('Failed to save state:', err));
    }
    getDeployment(siteId) {
        return this.deployments.get(siteId);
    }
    deleteDeployment(siteId) {
        this.deployments.delete(siteId);
        this.save().catch((err) => console.error('Failed to save state:', err));
    }
    get activeSandboxes() {
        return Array.from(this.sandboxes.values()).filter((s) => s.status !== 'terminated').length;
    }
    get activeDeployments() {
        return this.deployments.size;
    }
}
exports.AgentStore = AgentStore;
//# sourceMappingURL=store.js.map