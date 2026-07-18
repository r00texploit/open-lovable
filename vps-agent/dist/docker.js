"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docker = void 0;
exports.createOrResumeSandbox = createOrResumeSandbox;
exports.getSandboxInfo = getSandboxInfo;
exports.removeSandbox = removeSandbox;
exports.execInContainer = execInContainer;
exports.writeFilesToContainer = writeFilesToContainer;
exports.readFileFromContainer = readFileFromContainer;
exports.listFilesInContainer = listFilesInContainer;
exports.extendSandboxTimeout = extendSandboxTimeout;
exports.reconcileExistingContainers = reconcileExistingContainers;
exports.getContainerForSandbox = getContainerForSandbox;
const dockerode_1 = __importDefault(require("dockerode"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const template_1 = require("./template");
const routes_1 = require("./routes");
const security_1 = require("./security");
exports.docker = new dockerode_1.default();
const HOST = process.env.VPS_HOST ?? '127.0.0.1';
const PORT_MIN = parseInt(process.env.VPS_PORT_MIN ?? '10000', 10);
const PORT_MAX = parseInt(process.env.VPS_PORT_MAX ?? '20000', 10);
const IMAGE = process.env.VPS_SANDBOX_IMAGE ?? 'node:22-slim';
const DEFAULT_TIMEOUT_MINUTES = parseInt(process.env.VPS_DEFAULT_TIMEOUT_MINUTES ?? '45', 10);
const WORKING_DIR = process.env.VPS_SANDBOX_WORKING_DIR ?? '/vercel/sandbox';
const AGENT_LABEL = 'vps-agent';
const BIND_IP = process.env.VPS_SANDBOX_BIND_IP ?? '127.0.0.1';
const MEMORY_BYTES = parseInt(process.env.VPS_SANDBOX_MEMORY_BYTES ?? String(1024 * 1024 * 1024), 10);
const NANO_CPUS = parseInt(process.env.VPS_SANDBOX_NANO_CPUS ?? String(1_000_000_000), 10);
const PIDS_LIMIT = parseInt(process.env.VPS_SANDBOX_PIDS_LIMIT ?? '256', 10);
const DISK_BYTES = parseInt(process.env.VPS_SANDBOX_DISK_BYTES ?? String(768 * 1024 * 1024), 10);
const TMP_BYTES = parseInt(process.env.VPS_SANDBOX_TMP_BYTES ?? String(128 * 1024 * 1024), 10);
const EXEC_TIMEOUT_SECONDS = parseInt(process.env.VPS_EXEC_TIMEOUT_SECONDS ?? '300', 10);
const SANDBOX_NETWORK = process.env.VPS_SANDBOX_NETWORK ?? 'vps-sandbox-network';
const SANDBOX_SUBNET = process.env.VPS_SANDBOX_SUBNET ?? '172.30.0.0/24';
const SANDBOX_USER = process.env.VPS_SANDBOX_USER ?? '1000:1000';
const [SANDBOX_UID, SANDBOX_GID] = SANDBOX_USER.split(':').map(Number);
const SANDBOX_RUNTIME = process.env.VPS_SANDBOX_RUNTIME ?? '';
const SECURITY_VERSION = '2';
function validateDockerConfig() {
    if (!Number.isSafeInteger(PORT_MIN) || !Number.isSafeInteger(PORT_MAX) || PORT_MIN < 1024 || PORT_MAX > 65535 || PORT_MIN > PORT_MAX) {
        throw new Error('VPS sandbox port range is invalid');
    }
    if (!Number.isSafeInteger(MEMORY_BYTES) || MEMORY_BYTES < 128 * 1024 * 1024) {
        throw new Error('VPS_SANDBOX_MEMORY_BYTES must be at least 128 MiB');
    }
    if (!Number.isSafeInteger(NANO_CPUS) || NANO_CPUS <= 0 || !Number.isSafeInteger(PIDS_LIMIT) || PIDS_LIMIT < 16) {
        throw new Error('VPS sandbox CPU/PID limits are invalid');
    }
    if (!Number.isSafeInteger(DISK_BYTES) || DISK_BYTES < 256 * 1024 * 1024 || !Number.isSafeInteger(TMP_BYTES) || TMP_BYTES < 32 * 1024 * 1024) {
        throw new Error('VPS sandbox workspace/tmp limits are invalid');
    }
    if (!Number.isSafeInteger(EXEC_TIMEOUT_SECONDS) || EXEC_TIMEOUT_SECONDS < 10 || EXEC_TIMEOUT_SECONDS > 3600) {
        throw new Error('VPS_EXEC_TIMEOUT_SECONDS must be between 10 and 3600');
    }
    if (!/^\d+:\d+$/.test(SANDBOX_USER))
        throw new Error('VPS_SANDBOX_USER must use numeric uid:gid form');
    if (SANDBOX_RUNTIME && !/^[a-zA-Z0-9_.-]+$/.test(SANDBOX_RUNTIME))
        throw new Error('VPS_SANDBOX_RUNTIME is invalid');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(SANDBOX_NETWORK) || !/^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/.test(SANDBOX_SUBNET)) {
        throw new Error('VPS sandbox network configuration is invalid');
    }
}
async function ensureSandboxNetwork() {
    validateDockerConfig();
    if (SANDBOX_RUNTIME) {
        const dockerInfo = await exports.docker.info();
        if (!dockerInfo.Runtimes?.[SANDBOX_RUNTIME]) {
            throw new Error(`Configured sandbox runtime ${SANDBOX_RUNTIME} is not installed in Docker`);
        }
    }
    const networks = await exports.docker.listNetworks({ filters: { name: [SANDBOX_NETWORK] } });
    if (networks.some((network) => network.Name === SANDBOX_NETWORK))
        return;
    try {
        await exports.docker.createNetwork({
            Name: SANDBOX_NETWORK,
            Driver: 'bridge',
            CheckDuplicate: true,
            EnableIPv6: false,
            IPAM: { Config: [{ Subnet: SANDBOX_SUBNET }] },
            Options: { 'com.docker.network.bridge.enable_icc': 'false' },
            Labels: { [AGENT_LABEL]: 'true' },
        });
    }
    catch (error) {
        const afterRace = await exports.docker.listNetworks({ filters: { name: [SANDBOX_NETWORK] } });
        if (!afterRace.some((network) => network.Name === SANDBOX_NETWORK))
            throw error;
    }
}
async function ensureSandboxImage() {
    try {
        await exports.docker.getImage(IMAGE).inspect();
        return;
    }
    catch {
        // Pull below. docker.createContainer does not pull missing images itself.
    }
    const stream = await exports.docker.pull(IMAGE);
    await new Promise((resolve, reject) => {
        exports.docker.modem.followProgress(stream, (progressError) => {
            if (progressError)
                reject(progressError);
            else
                resolve();
        });
    });
}
function getExpiresAt(timeoutMinutes) {
    const minutes = timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}
async function findFreePort() {
    const used = new Set();
    const containers = await exports.docker.listContainers({ all: true });
    for (const c of containers) {
        for (const p of c.Ports ?? []) {
            if (typeof p.PublicPort === 'number')
                used.add(p.PublicPort);
        }
    }
    for (let port = PORT_MIN; port <= PORT_MAX; port++) {
        if (!used.has(port))
            return port;
    }
    throw new Error('No free host ports available');
}
async function getContainerBySandboxId(sandboxId) {
    const containers = await exports.docker.listContainers({
        all: true,
        filters: { label: [`${AGENT_LABEL}=true`, `sandboxId=${sandboxId}`] }
    });
    if (containers.length === 0)
        return undefined;
    return exports.docker.getContainer(containers[0].Id);
}
function buildUrl(subdomain, _customDomain, baseDomain) {
    if (subdomain)
        return `https://${subdomain}.${baseDomain}`;
    return '';
}
function extractHostPort(info) {
    const binding = info.HostConfig.PortBindings?.['3000/tcp']?.[0];
    if (binding?.HostPort)
        return parseInt(binding.HostPort, 10);
    const networkSettings = info.NetworkSettings.Ports?.['3000/tcp']?.[0];
    if (networkSettings?.HostPort)
        return parseInt(networkSettings.HostPort, 10);
    throw new Error('Could not determine mapped host port');
}
async function runDockerCli(args, timeoutMs = (EXEC_TIMEOUT_SECONDS + 10) * 1000) {
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)('docker', args, { stdio: 'ignore' });
        let settled = false;
        const timer = setTimeout(() => {
            if (settled)
                return;
            settled = true;
            proc.kill('SIGKILL');
            reject(new Error(`docker ${args[0] || 'command'} timed out`));
        }, timeoutMs);
        proc.on('error', (error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });
        proc.on('close', (code) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            if (code === 0)
                resolve();
            else
                reject(new Error(`docker ${args.join(' ')} exited with code ${code}`));
        });
    });
}
async function runDockerCliWithOutput(args, timeoutMs = (EXEC_TIMEOUT_SECONDS + 10) * 1000) {
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)('docker', args);
        let stdout = '';
        let stderr = '';
        let settled = false;
        const timer = setTimeout(() => {
            if (settled)
                return;
            settled = true;
            proc.kill('SIGKILL');
            reject(new Error(`docker ${args[0] || 'command'} timed out`));
        }, timeoutMs);
        proc.stdout.on('data', (data) => { stdout += data.toString('utf8'); });
        proc.stderr.on('data', (data) => { stderr += data.toString('utf8'); });
        proc.on('error', (error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });
        proc.on('close', (code) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve({ stdout, stderr, exitCode: code ?? 0 });
        });
    });
}
async function createOrResumeSandbox(store, config) {
    await ensureSandboxNetwork();
    await ensureSandboxImage();
    (0, security_1.assertSafeId)(config.sandboxId, 'sandbox ID');
    (0, security_1.assertSafeId)(config.sandboxName, 'sandbox name');
    let existing = await getContainerBySandboxId(config.sandboxId);
    if (existing) {
        const existingInfo = await existing.inspect();
        if (existingInfo.Config.Labels?.sandboxSecurityVersion !== SECURITY_VERSION) {
            await existing.remove({ force: true });
            existing = undefined;
            (0, routes_1.removeSandboxRoutes)(store, config.sandboxId);
            store.deleteSandbox(config.sandboxId);
        }
    }
    if (existing) {
        const info = await existing.inspect();
        if (!info.State.Running) {
            await existing.start();
        }
        const port = extractHostPort(info);
        const sandboxInfo = {
            sandboxId: config.sandboxId,
            sandboxName: config.sandboxName,
            url: buildUrl(config.subdomain, config.customDomain, config.baseDomain),
            containerId: info.Id,
            host: HOST,
            port,
            status: 'running',
            createdAt: new Date(info.Created).toISOString(),
            expiresAt: getExpiresAt(config.timeoutMinutes)
        };
        store.setSandbox(sandboxInfo);
        (0, routes_1.addSandboxRoutes)(store, sandboxInfo, config.baseDomain, config.subdomain, config.customDomain);
        return sandboxInfo;
    }
    const hostPort = await findFreePort();
    const containerName = `vps-${config.sandboxName.replace(/[^a-zA-Z0-9_-]/g, '-')}-${config.sandboxId.slice(0, 8)}`;
    const container = await exports.docker.createContainer({
        Image: IMAGE,
        name: containerName,
        Labels: {
            [AGENT_LABEL]: 'true',
            sandboxId: config.sandboxId,
            sandboxName: config.sandboxName,
            sandboxSecurityVersion: SECURITY_VERSION,
            ...(config.subdomain ? { subdomain: config.subdomain } : {})
        },
        ExposedPorts: { '3000/tcp': {} },
        HostConfig: {
            PortBindings: { '3000/tcp': [{ HostIp: BIND_IP, HostPort: String(hostPort) }] },
            NetworkMode: SANDBOX_NETWORK,
            RestartPolicy: { Name: 'no' },
            Memory: MEMORY_BYTES,
            NanoCpus: NANO_CPUS,
            PidsLimit: PIDS_LIMIT,
            CapDrop: ['ALL'],
            SecurityOpt: ['no-new-privileges:true'],
            ReadonlyRootfs: true,
            Tmpfs: {
                [WORKING_DIR]: `rw,nosuid,nodev,exec,size=${DISK_BYTES},uid=${SANDBOX_UID},gid=${SANDBOX_GID},mode=0750`,
                '/tmp': `rw,nosuid,nodev,exec,size=${TMP_BYTES},uid=${SANDBOX_UID},gid=${SANDBOX_GID},mode=1777`,
            },
            Sysctls: {
                'net.ipv6.conf.all.disable_ipv6': '1',
                'net.ipv6.conf.default.disable_ipv6': '1',
            },
            ...(SANDBOX_RUNTIME ? { Runtime: SANDBOX_RUNTIME } : {})
        },
        Env: ['NODE_ENV=development', 'HOME=/tmp/home', 'NPM_CONFIG_CACHE=/tmp/npm-cache'],
        User: SANDBOX_USER,
        Cmd: ['tail', '-f', '/dev/null'],
        WorkingDir: WORKING_DIR
    });
    await container.start();
    const containerInfo = await container.inspect();
    const port = extractHostPort(containerInfo);
    const sandboxInfo = {
        sandboxId: config.sandboxId,
        sandboxName: config.sandboxName,
        url: buildUrl(config.subdomain, config.customDomain, config.baseDomain),
        containerId: containerInfo.Id,
        host: HOST,
        port,
        status: 'running',
        createdAt: new Date().toISOString(),
        expiresAt: getExpiresAt(config.timeoutMinutes)
    };
    store.setSandbox(sandboxInfo);
    if (config.setupOnCreate) {
        await setupViteTemplate(container, WORKING_DIR);
        await execInContainer(container, ['npm', 'install'], { cwd: WORKING_DIR });
        await execInContainer(container, ['npm', 'run', 'dev'], { cwd: WORKING_DIR, detach: true });
    }
    (0, routes_1.addSandboxRoutes)(store, sandboxInfo, config.baseDomain, config.subdomain, config.customDomain);
    return sandboxInfo;
}
async function setupViteTemplate(container, cwd) {
    const files = (0, template_1.getViteTemplate)();
    await writeFilesToContainer(container, cwd, files);
}
async function getSandboxInfo(store, sandboxId) {
    const stored = store.getSandbox(sandboxId);
    if (!stored)
        return undefined;
    const container = await getContainerBySandboxId(sandboxId);
    if (!container) {
        (0, routes_1.removeSandboxRoutes)(store, sandboxId);
        store.deleteSandbox(sandboxId);
        return undefined;
    }
    const info = await container.inspect();
    if (!info.State.Running || info.Config.Labels?.sandboxSecurityVersion !== SECURITY_VERSION) {
        await container.remove({ force: true }).catch(() => undefined);
        (0, routes_1.removeSandboxRoutes)(store, sandboxId);
        store.deleteSandbox(sandboxId);
        return undefined;
    }
    return stored;
}
async function removeSandbox(store, sandboxId) {
    const container = await getContainerBySandboxId(sandboxId);
    if (container) {
        try {
            await container.stop({ t: 5 });
        }
        catch {
            // Container may already be stopped.
        }
        try {
            await container.remove({ force: true });
        }
        catch {
            // Ignore removal errors.
        }
    }
    (0, routes_1.removeSandboxRoutes)(store, sandboxId);
    store.deleteSandbox(sandboxId);
}
async function execInContainer(container, command, opts = {}) {
    const containerInfo = await container.inspect();
    const containerId = containerInfo.Id;
    const args = ['exec'];
    if (opts.cwd)
        args.push('-w', opts.cwd);
    if (opts.env) {
        for (const [k, v] of Object.entries(opts.env)) {
            args.push('-e', `${k}=${v}`);
        }
    }
    if (opts.detach)
        args.push('-d');
    const boundedCommand = opts.detach
        ? command
        : ['timeout', '--signal=KILL', `${opts.timeoutSeconds ?? EXEC_TIMEOUT_SECONDS}s`, ...command];
    args.push(containerId, ...boundedCommand);
    if (opts.detach) {
        await runDockerCli(args);
        return { stdout: '', stderr: '', exitCode: 0 };
    }
    return runDockerCliWithOutput(args);
}
async function writeFilesToContainer(container, cwd, files) {
    const containerInfo = await container.inspect();
    const containerId = containerInfo.Id;
    let written = 0;
    for (const file of files) {
        const fullContainerPath = (0, security_1.resolvePosixContainedPath)(cwd, file.path);
        const decoded = file.encoding === 'base64'
            ? Buffer.from(file.content, 'base64')
            : Buffer.from(file.content, 'utf8');
        // Ensure parent directory exists inside the container.
        const parentDir = path_1.default.posix.dirname(fullContainerPath);
        await execInContainer(container, ['mkdir', '-p', parentDir], { cwd: '/' });
        const tmpFile = path_1.default.join('/tmp', `vps-${crypto.randomUUID()}-${written}`);
        await promises_1.default.writeFile(tmpFile, decoded, { mode: 0o600 });
        await promises_1.default.chown(tmpFile, SANDBOX_UID, SANDBOX_GID);
        try {
            await runDockerCli(['cp', '-a', tmpFile, `${containerId}:${fullContainerPath}`], 60_000);
            written++;
        }
        finally {
            await promises_1.default.unlink(tmpFile).catch(() => { });
        }
    }
    return written;
}
async function readFileFromContainer(container, cwd, filePath) {
    const target = (0, security_1.resolvePosixContainedPath)(cwd, filePath);
    const result = await runDockerCliWithOutput(['exec', (await container.inspect()).Id, 'base64', '-w', '0', target]);
    if (result.exitCode !== 0) {
        throw new Error(result.stderr || 'Failed to read file');
    }
    return { content: result.stdout.trim(), encoding: 'base64' };
}
async function listFilesInContainer(container, cwd, dirPath) {
    const target = (0, security_1.resolvePosixContainedPath)(cwd, dirPath);
    const result = await runDockerCliWithOutput([
        'exec',
        (await container.inspect()).Id,
        'find',
        target,
        '-type',
        'f',
        '-not',
        '-path',
        '*/node_modules/*',
        '-not',
        '-path',
        '*/.git/*',
        '-not',
        '-path',
        '*/.next/*',
        '-not',
        '-path',
        '*/dist/*',
        '-not',
        '-path',
        '*/build/*'
    ]);
    if (result.exitCode !== 0) {
        throw new Error(result.stderr || 'Failed to list files');
    }
    const prefix = target.endsWith('/') ? target : `${target}/`;
    return result.stdout.split('\n').filter(Boolean).map((p) => p.startsWith(prefix) ? p.slice(prefix.length) : p);
}
async function extendSandboxTimeout(store, sandboxId, durationMs) {
    const sandbox = store.getSandbox(sandboxId);
    if (!sandbox)
        return false;
    sandbox.expiresAt = new Date(Date.now() + durationMs).toISOString();
    store.setSandbox(sandbox);
    return true;
}
async function reconcileExistingContainers(store) {
    await ensureSandboxNetwork();
    const containers = await exports.docker.listContainers({
        all: true,
        filters: { label: [`${AGENT_LABEL}=true`] }
    });
    const liveIds = new Set();
    for (const c of containers) {
        const sandboxId = c.Labels['sandboxId'];
        if (!sandboxId)
            continue;
        if (c.State !== 'running' || c.Labels.sandboxSecurityVersion !== SECURITY_VERSION) {
            const stale = exports.docker.getContainer(c.Id);
            await stale.remove({ force: true }).catch(() => undefined);
            (0, routes_1.removeSandboxRoutes)(store, sandboxId);
            store.sandboxes.delete(sandboxId);
            continue;
        }
        liveIds.add(sandboxId);
        const sandboxName = c.Labels['sandboxName'] ?? sandboxId;
        const port = c.Ports?.find((p) => p.PrivatePort === 3000)?.PublicPort ?? 0;
        const status = 'running';
        const persisted = store.getSandbox(sandboxId);
        store.setSandbox({
            sandboxId,
            sandboxName,
            url: persisted?.url ?? '',
            containerId: c.Id,
            host: HOST,
            port,
            status,
            createdAt: persisted?.createdAt ?? new Date(c.Created * 1000).toISOString(),
            expiresAt: persisted?.expiresAt
        });
    }
    for (const sandboxId of Array.from(store.sandboxes.keys())) {
        if (!liveIds.has(sandboxId)) {
            store.sandboxes.delete(sandboxId);
            (0, routes_1.removeSandboxRoutes)(store, sandboxId);
        }
    }
    await store.save();
}
async function getContainerForSandbox(sandboxId) {
    return getContainerBySandboxId(sandboxId);
}
//# sourceMappingURL=docker.js.map