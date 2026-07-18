"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiteDir = getSiteDir;
exports.createOrUpdateDeployment = createOrUpdateDeployment;
exports.removeDeployment = removeDeployment;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const routes_1 = require("./routes");
const security_1 = require("./security");
const DATA_DIR = process.env.VPS_DATA_DIR ?? '/data/vps-agent';
const SITES_DIR = path_1.default.join(DATA_DIR, 'sites');
const BASE_DOMAIN = process.env.VPS_BASE_DOMAIN ?? 'localhost';
function getSiteDir(siteId) {
    return path_1.default.join(SITES_DIR, (0, security_1.assertSafeId)(siteId, 'site ID'));
}
async function createOrUpdateDeployment(store, payload) {
    const siteDir = getSiteDir(payload.siteId);
    const releasesDir = path_1.default.join(siteDir, 'releases');
    const releaseDir = path_1.default.join(releasesDir, `${Date.now()}-${crypto.randomUUID()}`);
    await promises_1.default.mkdir(releaseDir, { recursive: true });
    try {
        for (const file of payload.files) {
            const fullPath = (0, security_1.resolveContainedPath)(releaseDir, file.path);
            await promises_1.default.mkdir(path_1.default.dirname(fullPath), { recursive: true });
            const decoded = file.encoding === 'base64'
                ? Buffer.from(file.content, 'base64')
                : Buffer.from(file.content, 'utf8');
            await promises_1.default.writeFile(fullPath, decoded);
        }
        await promises_1.default.access(path_1.default.join(releaseDir, 'index.html'));
    }
    catch (error) {
        await promises_1.default.rm(releaseDir, { recursive: true, force: true });
        throw error;
    }
    // Activate only after every file is durable. Requests continue using the
    // previous release until this in-memory route swap occurs.
    store.setDeployment(payload.siteId, {
        siteId: payload.siteId,
        subdomain: payload.subdomain,
        customDomain: payload.customDomain,
        releaseDir,
        deployedAt: new Date().toISOString(),
    });
    (0, routes_1.addDeploymentRoutes)(store, payload.siteId, payload.subdomain, payload.customDomain, releaseDir, BASE_DOMAIN);
    await store.save();
    const releases = await promises_1.default.readdir(releasesDir).catch(() => []);
    await Promise.all(releases
        .filter((name) => path_1.default.join(releasesDir, name) !== releaseDir)
        .map((name) => promises_1.default.rm((0, security_1.resolveContainedPath)(releasesDir, name), { recursive: true, force: true })));
}
async function removeDeployment(store, siteId) {
    const siteDir = getSiteDir(siteId);
    await promises_1.default.rm(siteDir, { recursive: true, force: true });
    (0, routes_1.removeDeploymentRoutes)(store, siteId);
    store.deleteDeployment(siteId);
}
//# sourceMappingURL=deployments.js.map