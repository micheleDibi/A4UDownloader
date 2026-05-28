import { config } from '../config';
import { HttpError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;

export interface A4UFetchOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${config.a4uBaseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export async function a4uFetch(pathOrUrl: string, opts: A4UFetchOptions = {}): Promise<Response> {
  const url = resolveUrl(pathOrUrl);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;

  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'X-API-Key': config.a4uApiKey,
          Accept: 'application/json',
          ...(opts.headers ?? {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status >= 500 && res.status < 600 && attempt < retries) {
        attempt++;
        await sleep(250 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) {
        attempt++;
        await sleep(250 * attempt);
        continue;
      }
      logger.error(`a4uFetch failed: ${url}`, err);
      throw new HttpError(502, { error: 'upstream_unreachable' });
    }
  }
  throw lastError ?? new HttpError(502, { error: 'upstream_unreachable' });
}

export async function a4uJson<T>(pathOrUrl: string, opts?: A4UFetchOptions): Promise<T> {
  const res = await a4uFetch(pathOrUrl, opts);
  if (!res.ok) {
    if (res.status === 404) throw new HttpError(404, { error: 'not_found' });
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(502, { error: 'upstream_unauthorized' });
    }
    throw new HttpError(res.status, { error: 'upstream_error' });
  }
  return (await res.json()) as T;
}
