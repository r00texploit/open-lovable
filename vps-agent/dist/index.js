"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const WORKING_DIR = process.env.VPS_SANDBOX_WORKING_DIR ?? '/vercel/sandbox';
const auth_1 = require("./auth");
const store_1 = require("./store");
const docker_1 = require("./docker");
const deployments_1 = require("./deployments");
const routes_1 = require("./routes");
const routes_2 = require("./routes");
const public_server_1 = require("./public-server");
const domain_authorization_1 = require("./domain-authorization");
const security_1 = require("./security");
const PORT = parseInt(process.env.VPS_AGENT_PORT ?? '3001', 10);
const VERSION = process.env.npm_package_version ?? '1.0.0';
const PUBLIC_PORT = parseInt(process.env.VPS_PUBLIC_ROUTER_PORT ?? '8080', 10);
const MAX_SANDBOXES = parseInt(process.env.VPS_MAX_SANDBOXES ?? '50', 10);
const MAX_DEPLOYMENT_BYTES = parseInt(process.env.VPS_MAX_DEPLOYMENT_BYTES ?? String(50 * 1024 * 1024), 10);
const EXEC_TIMEOUT_SECONDS = parseInt(process.env.VPS_EXEC_TIMEOUT_SECONDS ?? '300', 10);
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: `${Math.ceil(MAX_DEPLOYMENT_BYTES * 1.4) + 1024 * 1024}b` }));
app.use(auth_1.requireAuth);
const store = new store_1.AgentStore();
let mutationTail = Promise.resolve();
async function withMutationLock(operation) {
    const previous = mutationTail;
    let release;
    mutationTail = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
        return await operation();
    }
    finally {
        release();
    }
}
const configSchema = zod_1.z.object({
    sandboxName: zod_1.z.string().min(1),
    sandboxId: zod_1.z.string().min(1),
    subdomain: zod_1.z.string().optional(),
    customDomain: zod_1.z.string().optional(),
    baseDomain: zod_1.z.string().min(1),
    setupOnCreate: zod_1.z.boolean().optional(),
    timeoutMinutes: zod_1.z.number().int().positive().optional()
});
const execSchema = zod_1.z.object({
    command: zod_1.z.string().min(1).max(1024 * 1024),
    cwd: zod_1.z.string().optional(),
    env: zod_1.z.record(zod_1.z.string()).optional()
});
const filesSchema = zod_1.z.object({
    files: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string().min(1),
        content: zod_1.z.string(),
        encoding: zod_1.z.enum(['base64', 'utf8']).optional()
    })).max(2000)
});
const extendSchema = zod_1.z.object({
    durationMs: zod_1.z.number().int().positive()
});
const deploymentSchema = zod_1.z.object({
    siteId: zod_1.z.string().min(1),
    subdomain: zod_1.z.string().min(1),
    customDomain: zod_1.z.string().optional(),
    files: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string().min(1),
        content: zod_1.z.string(),
        encoding: zod_1.z.enum(['base64', 'utf8']).optional()
    })).max(5000)
});
const domainSchema = zod_1.z.object({
    domain: zod_1.z.string().min(1).max(253),
    siteId: zod_1.z.string().min(1).max(128),
    verificationToken: zod_1.z.string().regex(/^[a-zA-Z0-9_-]{32,128}$/),
});
function parseCommand(command) {
    // The Next.js provider sends full shell command strings (e.g. "bash -c 'npm install'").
    // Run them through bash so quoting, pipes, and variable expansion work as expected.
    return ['bash', '-c', command];
}
function handleAsync(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        version: VERSION,
        activeSandboxes: store.activeSandboxes,
        activeDeployments: store.activeDeployments
    });
});
// Caddy on-demand TLS authorization. This endpoint is loopback-only because
// the API listener itself binds to 127.0.0.1.
app.get('/caddy/ask', (req, res) => {
    const domain = typeof req.query.domain === 'string' ? req.query.domain.toLowerCase().replace(/\.$/, '') : '';
    const baseDomain = process.env.VPS_BASE_DOMAIN.toLowerCase();
    const authorized = store.routes.some((route) => route.host === domain && (0, routes_2.isRouteAuthorized)(route, baseDomain));
    res.sendStatus(authorized ? 200 : 404);
});
app.post('/sandboxes', handleAsync(async (req, res) => {
    const config = configSchema.parse(req.body);
    const info = await withMutationLock(async () => {
        if (!store.getSandbox(config.sandboxId) && store.activeSandboxes >= MAX_SANDBOXES) {
            const error = new Error('Sandbox capacity reached');
            error.status = 429;
            throw error;
        }
        return (0, docker_1.createOrResumeSandbox)(store, config);
    });
    res.status(201).json(info);
}));
app.get('/sandboxes/:sandboxId', handleAsync(async (req, res) => {
    const info = await withMutationLock(() => (0, docker_1.getSandboxInfo)(store, req.params.sandboxId));
    if (!info) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
    }
    res.json(info);
}));
app.delete('/sandboxes/:sandboxId', handleAsync(async (req, res) => {
    await withMutationLock(() => (0, docker_1.removeSandbox)(store, req.params.sandboxId));
    res.json({ removed: true });
}));
app.post('/sandboxes/:sandboxId/exec', handleAsync(async (req, res) => {
    const body = execSchema.parse(req.body);
    const container = await (0, docker_1.getContainerForSandbox)(req.params.sandboxId);
    if (!container) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
    }
    const result = await (0, docker_1.execInContainer)(container, parseCommand(body.command), {
        cwd: body.cwd ? (0, security_1.resolvePosixContainedPath)(WORKING_DIR, body.cwd) : WORKING_DIR,
        env: body.env,
        timeoutSeconds: EXEC_TIMEOUT_SECONDS,
    });
    res.json(result);
}));
app.post('/sandboxes/:sandboxId/files', handleAsync(async (req, res) => {
    const body = filesSchema.parse(req.body);
    const decodedBytes = body.files.reduce((total, file) => total + Buffer.byteLength(file.content, file.encoding === 'base64' ? 'base64' : 'utf8'), 0);
    if (decodedBytes > MAX_DEPLOYMENT_BYTES) {
        res.status(413).json({ error: 'File upload exceeds size limit' });
        return;
    }
    const container = await (0, docker_1.getContainerForSandbox)(req.params.sandboxId);
    if (!container) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
    }
    const written = await (0, docker_1.writeFilesToContainer)(container, WORKING_DIR, body.files);
    res.json({ written });
}));
app.get('/sandboxes/:sandboxId/files', handleAsync(async (req, res) => {
    const container = await (0, docker_1.getContainerForSandbox)(req.params.sandboxId);
    if (!container) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
    }
    if (typeof req.query.path === 'string') {
        const file = await (0, docker_1.readFileFromContainer)(container, WORKING_DIR, req.query.path);
        res.json(file);
        return;
    }
    if (typeof req.query.dir === 'string') {
        const files = await (0, docker_1.listFilesInContainer)(container, WORKING_DIR, req.query.dir);
        res.json({ files });
        return;
    }
    res.status(400).json({ error: 'Provide ?path= or ?dir=' });
}));
app.post('/sandboxes/:sandboxId/extend-timeout', handleAsync(async (req, res) => {
    const body = extendSchema.parse(req.body);
    const ok = await (0, docker_1.extendSandboxTimeout)(store, req.params.sandboxId, body.durationMs);
    if (!ok) {
        res.status(404).json({ error: 'Sandbox not found' });
        return;
    }
    res.json({ extended: true });
}));
app.post('/deployments', handleAsync(async (req, res) => {
    const payload = deploymentSchema.parse(req.body);
    const decodedBytes = payload.files.reduce((total, file) => total + Buffer.byteLength(file.content, file.encoding === 'base64' ? 'base64' : 'utf8'), 0);
    if (decodedBytes > MAX_DEPLOYMENT_BYTES) {
        res.status(413).json({ error: 'Deployment exceeds size limit' });
        return;
    }
    await withMutationLock(() => (0, deployments_1.createOrUpdateDeployment)(store, payload));
    res.status(201).json({ deployed: true, siteId: payload.siteId });
}));
app.delete('/deployments/:siteId', handleAsync(async (req, res) => {
    await withMutationLock(() => (0, deployments_1.removeDeployment)(store, req.params.siteId));
    res.json({ removed: true });
}));
app.post('/domains', handleAsync(async (req, res) => {
    const body = domainSchema.parse(req.body);
    const added = await withMutationLock(async () => (0, routes_2.addDomainRoute)(store, body.siteId, body.domain, body.verificationToken));
    if (!added) {
        res.status(404).json({ error: 'No deployment route exists for this site' });
        return;
    }
    res.status(201).json({ added: true });
}));
app.delete('/domains/:domain', handleAsync(async (req, res) => {
    res.json({ removed: await withMutationLock(async () => (0, routes_2.removeDomainRoute)(store, req.params.domain)) });
}));
app.get('/routes', (_req, res) => {
    res.json({
        routes: (0, routes_1.getRoutes)(store).map(({ domainVerificationToken: _secret, ...route }) => route),
    });
});
app.use((err, _req, res, _next) => {
    if (err instanceof zod_1.z.ZodError) {
        res.status(400).json({ error: 'Validation error', issues: err.errors });
        return;
    }
    console.error(err);
    const candidateStatus = typeof err === 'object' && err && 'status' in err ? err.status : undefined;
    const status = candidateStatus === 413 || candidateStatus === 429 ? candidateStatus : 500;
    res.status(status).json({ error: status === 413 ? 'Request body too large' : status === 429 ? 'Sandbox capacity reached' : 'Internal server error' });
});
async function start() {
    if (!process.env.VPS_AGENT_TOKEN || process.env.VPS_AGENT_TOKEN.length < 32) {
        throw new Error('VPS_AGENT_TOKEN must be a random value of at least 32 characters');
    }
    if (!process.env.VPS_BASE_DOMAIN) {
        throw new Error('VPS_BASE_DOMAIN is required');
    }
    if (!process.env.VPS_PUBLIC_IP) {
        throw new Error('VPS_PUBLIC_IP is required for custom-domain revalidation');
    }
    (0, security_1.normalizeHostname)(process.env.VPS_BASE_DOMAIN);
    if ((process.env.VPS_HOST ?? '127.0.0.1') !== '127.0.0.1') {
        throw new Error('VPS_HOST must be 127.0.0.1 so sandbox ports remain private');
    }
    if ((process.env.VPS_SANDBOX_BIND_IP ?? '127.0.0.1') !== '127.0.0.1') {
        throw new Error('VPS_SANDBOX_BIND_IP must be 127.0.0.1');
    }
    for (const [name, value] of Object.entries({ PORT, PUBLIC_PORT, MAX_SANDBOXES, MAX_DEPLOYMENT_BYTES, EXEC_TIMEOUT_SECONDS })) {
        if (!Number.isSafeInteger(value) || value <= 0)
            throw new Error(`${name} must be a positive integer`);
    }
    if (PORT > 65535 || PUBLIC_PORT > 65535 || PORT === PUBLIC_PORT) {
        throw new Error('Agent and public-router ports must be distinct valid TCP ports');
    }
    await store.load();
    await (0, docker_1.reconcileExistingContainers)(store);
    await withMutationLock(() => (0, domain_authorization_1.revalidateCustomDomainRoutes)(store, process.env.VPS_PUBLIC_IP));
    app.listen(PORT, '127.0.0.1', () => console.log(`VPS agent listening on 127.0.0.1:${PORT}`));
    (0, public_server_1.startPublicServer)(store, PUBLIC_PORT);
    setInterval(() => {
        const now = Date.now();
        for (const sandbox of store.sandboxes.values()) {
            if (sandbox.expiresAt && new Date(sandbox.expiresAt).getTime() <= now) {
                void withMutationLock(() => (0, docker_1.removeSandbox)(store, sandbox.sandboxId))
                    .catch((error) => console.error('Expiry cleanup failed:', error));
            }
        }
    }, 60_000).unref();
    setInterval(() => {
        void withMutationLock(() => (0, domain_authorization_1.revalidateCustomDomainRoutes)(store, process.env.VPS_PUBLIC_IP))
            .catch((error) => console.error('Custom-domain revalidation failed:', error));
    }, 5 * 60_000).unref();
}
void start().catch((error) => { console.error('VPS agent startup failed:', error); process.exit(1); });
//# sourceMappingURL=index.js.map