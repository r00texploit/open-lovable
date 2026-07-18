"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPublicServer = startPublicServer;
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const net_1 = __importDefault(require("net"));
const security_1 = require("./security");
const routes_1 = require("./routes");
const MIME = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
    '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8', '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm'
};
function safeHost(req) {
    return (req.headers.host ?? '').split(':')[0].toLowerCase().replace(/\.$/, '');
}
function securityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}
function proxy(req, res, target) {
    const [hostname, portText] = target.split(':');
    const upstream = http_1.default.request({
        hostname, port: Number(portText), method: req.method, path: req.url,
        headers: {
            ...req.headers,
            host: req.headers.host,
            'x-forwarded-proto': 'https',
            'x-forwarded-host': req.headers.host ?? '',
            'x-forwarded-for': req.socket.remoteAddress ?? '',
        }
    }, (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
    });
    upstream.setTimeout(30_000, () => upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error', () => {
        if (!res.headersSent)
            res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Upstream unavailable');
    });
    req.pipe(upstream);
}
async function serveStatic(req, res, root) {
    if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end();
        return;
    }
    let rawPath;
    try {
        rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    }
    catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid URL');
        return;
    }
    let filePath = (0, security_1.resolveContainedPath)(root, rawPath === '/' ? 'index.html' : rawPath);
    try {
        const stat = await fs_1.default.promises.stat(filePath);
        if (stat.isDirectory())
            filePath = (0, security_1.resolveContainedPath)(root, path_1.default.join(rawPath, 'index.html'));
    }
    catch {
        // SPA fallback is intentional for generated Vite applications.
        filePath = (0, security_1.resolveContainedPath)(root, 'index.html');
    }
    try {
        const stat = await fs_1.default.promises.stat(filePath);
        if (!stat.isFile())
            throw new Error('Not a file');
        securityHeaders(res);
        res.writeHead(200, {
            'Content-Type': MIME[path_1.default.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
            'Content-Length': stat.size,
            'Cache-Control': path_1.default.extname(filePath).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
        });
        if (req.method === 'HEAD')
            res.end();
        else
            fs_1.default.createReadStream(filePath).pipe(res);
    }
    catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
}
function startPublicServer(store, port, baseDomain = process.env.VPS_BASE_DOMAIN ?? 'localhost') {
    const server = http_1.default.createServer((req, res) => {
        const route = store.routes.find((candidate) => candidate.host === safeHost(req) && (0, routes_1.isRouteAuthorized)(candidate, baseDomain));
        if (!route) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Unknown site');
            return;
        }
        if (route.target.type === 'container')
            proxy(req, res, route.target.value);
        else
            void serveStatic(req, res, route.target.value).catch(() => {
                if (!res.headersSent)
                    res.writeHead(500);
                res.end('Internal server error');
            });
    });
    server.requestTimeout = 60_000;
    server.headersTimeout = 65_000;
    server.on('upgrade', (req, socket, head) => {
        const route = store.routes.find((candidate) => candidate.host === safeHost(req) && (0, routes_1.isRouteAuthorized)(candidate, baseDomain));
        if (!route || route.target.type !== 'container') {
            socket.destroy();
            return;
        }
        const [hostname, portText] = route.target.value.split(':');
        const upstream = net_1.default.connect(Number(portText), hostname, () => {
            const headerLines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
            for (let index = 0; index < req.rawHeaders.length; index += 2) {
                headerLines.push(`${req.rawHeaders[index]}: ${req.rawHeaders[index + 1]}`);
            }
            upstream.write(`${headerLines.join('\r\n')}\r\n\r\n`);
            if (head.length)
                upstream.write(head);
            socket.pipe(upstream).pipe(socket);
        });
        upstream.setTimeout(60_000, () => upstream.destroy());
        upstream.on('error', () => socket.destroy());
        socket.on('error', () => upstream.destroy());
    });
    server.listen(port, '127.0.0.1', () => console.log(`VPS public router listening on 127.0.0.1:${port}`));
    return server;
}
//# sourceMappingURL=public-server.js.map