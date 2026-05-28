import { Router } from 'express';
import * as crypto from 'crypto';
import { config } from '../config';
import {
  clearSessionCookie,
  requireAuth,
  signSessionCookie,
  type AuthedRequest,
} from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimit';

export const authRouter = Router();

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

authRouter.post('/login', loginRateLimiter, (req, res) => {
  const body = req.body as { username?: unknown; password?: unknown } | undefined;
  if (
    !body ||
    typeof body.username !== 'string' ||
    typeof body.password !== 'string'
  ) {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }
  const userOk = safeEqual(body.username, config.authUsername);
  const passOk = safeEqual(body.password, config.authPassword);
  if (!userOk || !passOk) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  signSessionCookie(res);
  res.json({ ok: true });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ authenticated: true, sub: req.user?.sub ?? null });
});
