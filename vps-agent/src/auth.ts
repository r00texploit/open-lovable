import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const TOKEN = process.env.VPS_AGENT_TOKEN;

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
  if (!match || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
