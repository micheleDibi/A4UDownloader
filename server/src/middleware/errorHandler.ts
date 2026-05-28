import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export class HttpError extends Error {
  constructor(public status: number, public body: object | string = { error: 'internal' }) {
    super(typeof body === 'string' ? body : JSON.stringify(body));
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.status(err.status).json(
      typeof err.body === 'string' ? { error: err.body } : err.body
    );
    return;
  }
  logger.error('Unhandled error:', err);
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.status(500).json({ error: 'internal_error' });
}
