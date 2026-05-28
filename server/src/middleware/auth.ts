import type { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthedRequest extends Request {
  user?: { sub: string };
}

const SESSION_COOKIE = 'session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function signSessionCookie(res: Response): void {
  const token = jwt.sign({ sub: config.authUsername }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    req.user = { sub: String(payload.sub ?? '') };
    next();
  } catch {
    clearSessionCookie(res);
    res.status(401).json({ error: 'unauthorized' });
  }
}
