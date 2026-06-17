import type { Response } from 'express';
import { Readable } from 'node:stream';
import { config } from '../config';
import { HttpError } from '../middleware/errorHandler';
import { contentDisposition } from '../utils/contentDisposition';
import { logger } from '../utils/logger';

// Replica di `_normalize_segments` di a4u/backend/app/services/remote_storage.py:
// normalizza i separatori e rifiuta il path traversal (`..`).
function normalizeSegments(rel: string): string {
  const cleaned = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = cleaned.split('/').filter(Boolean);
  for (const p of parts) {
    if (p === '.' || p === '..') {
      throw new HttpError(400, { error: 'invalid_path' });
    }
  }
  return parts.join('/');
}

// Replica di `pdf_key`: i path su DB (`{org}/{course}/{lesson}.pdf`) vivono
// sotto il namespace `generated_pdfs/`.
export function pdfKey(rel: string): string {
  let r = normalizeSegments(rel);
  if (r.startsWith('generated_pdfs/')) {
    r = r.slice('generated_pdfs/'.length);
  }
  return r ? `generated_pdfs/${r}` : 'generated_pdfs';
}

export function mediaUrl(key: string): string {
  return `${config.mediaBaseUrl}/${key}`;
}

// Apre un file dallo storage OVH per lo ZIP. null se non raggiungibile.
export async function openMedia(rel: string): Promise<Readable | null> {
  const url = mediaUrl(pdfKey(rel));
  try {
    const r = await fetch(url);
    if (!r.ok || !r.body) {
      logger.warn(`media fetch ${url} -> status ${r.status}`);
      return null;
    }
    return Readable.fromWeb(r.body as never);
  } catch (e) {
    logger.warn(`media fetch failed ${url}:`, e);
    return null;
  }
}

// Proxy/stream di un PDF verso il client con un nome file leggibile.
export async function streamMedia(
  res: Response,
  rel: string,
  filename: string
): Promise<void> {
  const url = mediaUrl(pdfKey(rel));
  let upstream: Awaited<ReturnType<typeof fetch>>;
  try {
    upstream = await fetch(url);
  } catch (e) {
    logger.warn(`media fetch failed ${url}:`, e);
    throw new HttpError(502, { error: 'media_unreachable' });
  }
  if (!upstream.ok || !upstream.body) {
    throw new HttpError(upstream.status === 404 ? 404 : 502, {
      error: 'media_unavailable',
    });
  }
  res.setHeader(
    'Content-Type',
    upstream.headers.get('content-type') || 'application/pdf'
  );
  res.setHeader('Content-Disposition', contentDisposition(filename));
  const len = upstream.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);
  Readable.fromWeb(upstream.body as never).pipe(res);
}
