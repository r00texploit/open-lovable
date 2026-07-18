"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const crypto_1 = require("crypto");
const TOKEN = process.env.VPS_AGENT_TOKEN;
function requireAuth(req, res, next) {
    if (req.path === '/health' || req.path === '/caddy/ask') {
        next();
        return;
    }
    if (!TOKEN) {
        res.status(500).json({ error: 'Agent token not configured' });
        return;
    }
    const header = req.headers.authorization ?? '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    const supplied = Buffer.from(match?.[1] ?? '');
    const expected = Buffer.from(TOKEN);
    if (!match || supplied.length !== expected.length || !(0, crypto_1.timingSafeEqual)(supplied, expected)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map