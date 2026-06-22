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

// Replica di `pdf_key`: i PDF (`{org}/{course}/{lesson}.pdf`) vivono sotto il
// namespace `generated_pdfs/`.
export function pdfKey(rel: string): string {
  let r = normalizeSegments(rel);
  if (r.startsWith('generated_pdfs/')) {
    r = r.slice('generated_pdfs/'.length);
  }
  return r ? `generated_pdfs/${r}` : 'generated_pdfs';
}

// Replica di `uploads_key`: i file caricati/generati non-PDF (es. i video
// `lesson_videos/...` e `lesson_avatar_videos/...`) vivono sotto `uploads/`.
export function uploadsKey(rel: string): string {
  let r = normalizeSegments(rel);
  if (r.startsWith('uploads/')) r = r.slice('uploads/'.length);
  else if (r === 'uploads') r = '';
  return r ? `uploads/${r}` : 'uploads';
}

export function mediaUrl(key: string): string {
  return `${config.mediaBaseUrl}/${key}`;
}

// Apre una key dallo storage OVH per lo ZIP. null se non raggiungibile.
async function openKey(key: string): Promise<Readable | null> {
  const url = mediaUrl(key);
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

export const openPdf = (rel: string) => openKey(pdfKey(rel));
export const openUpload = (rel: string) => openKey(uploadsKey(rel));

// Proxy/stream di una key verso il client con un nome file leggibile.
async function streamKey(
  res: Response,
  key: string,
  filename: string,
  fallbackType: string
): Promise<void> {
  const url = mediaUrl(key);
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
    upstream.headers.get('content-type') || fallbackType
  );
  res.setHeader('Content-Disposition', contentDisposition(filename));
  const len = upstream.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);
  Readable.fromWeb(upstream.body as never).pipe(res);
}

export const streamPdf = (res: Response, rel: string, filename: string) =>
  streamKey(res, pdfKey(rel), filename, 'application/pdf');

export const streamUpload = (res: Response, rel: string, filename: string) =>
  streamKey(res, uploadsKey(rel), filename, 'application/octet-stream');
