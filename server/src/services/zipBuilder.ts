import type { Request, Response } from 'express';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import type { Lesson, LessonDetail, ModuleDetail } from '../types';
import { a4uFetch, a4uJson } from './a4uClient';
import { contentDisposition } from '../utils/contentDisposition';
import { ordinalPrefix, slugify } from '../utils/slugify';
import { buildQuizCsvForLesson } from './csvBuilder';
import { logger } from '../utils/logger';

const S3_ALLOWED_HOST = 'audios-avatar.s3.eu-north-1.amazonaws.com';

interface FileTarget {
  name: string;
  url: string;
  needsApiKey: boolean;
}

function extensionFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const dot = pathname.lastIndexOf('.');
    if (dot < 0) return fallback;
    const ext = pathname.slice(dot).toLowerCase();
    if (/^\.[a-z0-9]{1,5}$/.test(ext)) return ext;
  } catch {
    /* fallthrough */
  }
  return fallback;
}

function lessonContentTargets(lesson: Lesson, folderPrefix: string): FileTarget[] {
  const targets: FileTarget[] = [];
  targets.push({
    name: `${folderPrefix}01-lezione.pdf`,
    url: `/lessons/${lesson.id}/pdf`,
    needsApiKey: true,
  });
  if (lesson.slides_pdf_url) {
    targets.push({
      name: `${folderPrefix}02-slides${extensionFromUrl(lesson.slides_pdf_url, '.pdf')}`,
      url: lesson.slides_pdf_url,
      needsApiKey: false,
    });
  }
  if (lesson.slides_and_audio_video_url) {
    targets.push({
      name: `${folderPrefix}03-video${extensionFromUrl(lesson.slides_and_audio_video_url, '.mp4')}`,
      url: lesson.slides_and_audio_video_url,
      needsApiKey: false,
    });
  }
  if (lesson.slides_and_avatar_video_url) {
    targets.push({
      name: `${folderPrefix}04-video-avatar${extensionFromUrl(lesson.slides_and_avatar_video_url, '.mp4')}`,
      url: lesson.slides_and_avatar_video_url,
      needsApiKey: false,
    });
  }
  return targets;
}

async function openTarget(target: FileTarget): Promise<Readable | null> {
  try {
    if (target.needsApiKey) {
      const r = await a4uFetch(target.url);
      if (!r.ok || !r.body) {
        logger.warn(`upstream PDF ${target.name} -> status ${r.status}`);
        return null;
      }
      return Readable.fromWeb(r.body as never);
    }
    const u = new URL(target.url);
    if (u.host !== S3_ALLOWED_HOST) {
      logger.warn(`Untrusted S3 host for ${target.name}: ${u.host}`);
      return null;
    }
    const r = await fetch(target.url);
    if (!r.ok || !r.body) {
      logger.warn(`upstream S3 ${target.name} -> status ${r.status}`);
      return null;
    }
    return Readable.fromWeb(r.body as never);
  } catch (e) {
    logger.warn(`Failed to open target ${target.name}:`, e);
    return null;
  }
}

function appendAndAwait(
  archive: archiver.Archiver,
  source: Readable,
  name: string
): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const cleanup = () => {
      archive.off('entry', onEntry);
      source.off('error', onSrcErr);
    };
    const onEntry = (entry: archiver.EntryData) => {
      if (entry.name === name) {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      }
    };
    const onSrcErr = (e: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      logger.warn(`source stream error for ${name}:`, e);
      try {
        source.destroy();
      } catch {
        /* ignore */
      }
      resolve();
    };
    archive.on('entry', onEntry);
    source.on('error', onSrcErr);
    archive.append(source, { name });
  });
}

async function appendLessonContent(
  archive: archiver.Archiver,
  lesson: LessonDetail,
  folderPrefix: string
): Promise<string[]> {
  const skipped: string[] = [];
  if (lesson.lesson_type === 'ASSESSMENT') {
    try {
      const csv = await buildQuizCsvForLesson(lesson);
      const entryName = `${folderPrefix}quiz.csv`;
      await new Promise<void>((resolve) => {
        const onEntry = (e: archiver.EntryData) => {
          if (e.name === entryName) {
            archive.off('entry', onEntry);
            resolve();
          }
        };
        archive.on('entry', onEntry);
        archive.append(csv, { name: entryName });
      });
    } catch (e) {
      logger.warn(`Quiz CSV failed for lesson ${lesson.id}:`, e);
      skipped.push(`${folderPrefix}quiz.csv`);
    }
    return skipped;
  }
  const targets = lessonContentTargets(lesson, folderPrefix);
  for (const t of targets) {
    const source = await openTarget(t);
    if (!source) {
      skipped.push(t.name);
      continue;
    }
    await appendAndAwait(archive, source, t.name);
  }
  return skipped;
}

function bootstrapArchive(res: Response, filename: string): archiver.Archiver {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', contentDisposition(filename));
  res.setHeader('Cache-Control', 'no-store');
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('warning', (e: archiver.ArchiverError) => {
    if (e.code !== 'ENOENT') logger.warn('archiver warning:', e);
  });
  archive.on('error', (e: archiver.ArchiverError) => {
    logger.error('archiver error:', e);
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.destroy();
    }
  });
  archive.pipe(res);
  return archive;
}

function appendManifest(archive: archiver.Archiver, skipped: string[]): void {
  if (skipped.length === 0) return;
  const body =
    `File mancanti (l'API non li ha restituiti o l'URL S3 non era raggiungibile):\n` +
    skipped.map((s) => `- ${s}`).join('\n') +
    '\n';
  archive.append(body, { name: 'MANIFEST.txt' });
}

export async function streamLessonZip(
  req: Request,
  res: Response,
  lesson: LessonDetail
): Promise<void> {
  const baseName = slugify(lesson.title || `lezione-${lesson.id}`);
  const archive = bootstrapArchive(res, `${baseName}.zip`);
  let aborted = false;
  req.on('close', () => {
    if (!res.writableEnded) {
      aborted = true;
      try {
        archive.abort();
      } catch {
        /* ignore */
      }
    }
  });
  const skipped = await appendLessonContent(archive, lesson, '');
  if (aborted) return;
  appendManifest(archive, skipped);
  await archive.finalize();
}

export async function streamModuleZip(
  req: Request,
  res: Response,
  mod: ModuleDetail
): Promise<void> {
  const baseName = slugify(mod.title || `modulo-${mod.id}`);
  const archive = bootstrapArchive(res, `${baseName}.zip`);
  let aborted = false;
  req.on('close', () => {
    if (!res.writableEnded) {
      aborted = true;
      try {
        archive.abort();
      } catch {
        /* ignore */
      }
    }
  });

  const lessons = (mod.lessons ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const allSkipped: string[] = [];
  for (let i = 0; i < lessons.length; i++) {
    if (aborted) return;
    const lesson = lessons[i]!;
    const folderSlug = slugify(lesson.title || `lezione-${lesson.id}`);
    const folder = `${ordinalPrefix(i, folderSlug)}/`;
    let lessonDetail: LessonDetail = lesson as LessonDetail;
    if (lesson.lesson_type === 'ASSESSMENT') {
      try {
        lessonDetail = await a4uJson<LessonDetail>(`/lessons/${lesson.id}`);
      } catch (e) {
        logger.warn(`fetch lesson detail failed for ${lesson.id}:`, e);
        allSkipped.push(`${folder}quiz.csv`);
        continue;
      }
    }
    const skipped = await appendLessonContent(archive, lessonDetail, folder);
    allSkipped.push(...skipped);
  }
  if (aborted) return;
  appendManifest(archive, allSkipped);
  await archive.finalize();
}
