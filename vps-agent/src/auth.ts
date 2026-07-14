import type { Request, Response, NextFunction } from 'express';

const TOKEN = process.env.VPS_AGENT_TOKEN;

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') {
    next();
    return;
  }

  if (!TOKEN) {
    res.status(500).json({ error: 'Agent token not configured' });
    return;
  }

  const header = req.headers.authorization ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match || match[1] !== TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
