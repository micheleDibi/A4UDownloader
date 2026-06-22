import type { Request, Response } from 'express';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import { contentDisposition } from '../utils/contentDisposition';
import { ordinalPrefix, slugify } from '../utils/slugify';
import { buildQuizCsv } from './csvBuilder';
import { openPdf, openUpload } from './media';
import type { LessonRecord, ModuleWithRecords } from './db';
import { logger } from '../utils/logger';

interface FileTarget {
  name: string;
  rel: string;
  source: 'pdf' | 'upload';
}

function lessonContentTargets(
  lesson: LessonRecord,
  folderPrefix: string
): FileTarget[] {
  const targets: FileTarget[] = [];
  if (lesson.pdf_status === 'ready' && lesson.pdf_path) {
    targets.push({
      name: `${folderPrefix}01-dispensa.pdf`,
      rel: lesson.pdf_path,
      source: 'pdf',
    });
  }
  if (lesson.slides_pdf_status === 'ready' && lesson.slides_pdf_path) {
    targets.push({
      name: `${folderPrefix}02-slides.pdf`,
      rel: lesson.slides_pdf_path,
      source: 'pdf',
    });
  }
  if (lesson.video_status === 'ready' && lesson.video_path) {
    targets.push({
      name: `${folderPrefix}03-video.mp4`,
      rel: lesson.video_path,
      source: 'upload',
    });
  }
  if (lesson.avatar_video_status === 'ready' && lesson.avatar_video_path) {
    targets.push({
      name: `${folderPrefix}04-video-avatar.mp4`,
      rel: lesson.avatar_video_path,
      source: 'upload',
    });
  }
  return targets;
}

function appendStreamAndAwait(
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

function appendBufferAndAwait(
  archive: archiver.Archiver,
  data: string | Buffer,
  name: string
): Promise<void> {
  return new Promise<void>((resolve) => {
    const onEntry = (entry: archiver.EntryData) => {
      if (entry.name === name) {
        archive.off('entry', onEntry);
        resolve();
      }
    };
    archive.on('entry', onEntry);
    archive.append(data, { name });
  });
}

async function appendLessonContent(
  archive: archiver.Archiver,
  lesson: LessonRecord,
  folderPrefix: string
): Promise<string[]> {
  const skipped: string[] = [];
  if (lesson.is_assessment) {
    try {
      const csv = buildQuizCsv(lesson.content_raw);
      await appendBufferAndAwait(archive, csv, `${folderPrefix}quiz.csv`);
    } catch (e) {
      logger.warn(`Quiz CSV failed for lesson ${lesson.id}:`, e);
      skipped.push(`${folderPrefix}quiz.csv`);
    }
    return skipped;
  }
  const targets = lessonContentTargets(lesson, folderPrefix);
  for (const t of targets) {
    const source =
      t.source === 'pdf' ? await openPdf(t.rel) : await openUpload(t.rel);
    if (!source) {
      skipped.push(t.name);
      continue;
    }
    await appendStreamAndAwait(archive, source, t.name);
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
    `File mancanti (non presenti sullo storage o non raggiungibili):\n` +
    skipped.map((s) => `- ${s}`).join('\n') +
    '\n';
  archive.append(body, { name: 'MANIFEST.txt' });
}

export async function streamLessonZip(
  req: Request,
  res: Response,
  lesson: LessonRecord
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
  mod: ModuleWithRecords
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

  const lessons = mod.lessons
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const allSkipped: string[] = [];
  for (let i = 0; i < lessons.length; i++) {
    if (aborted) return;
    const lesson = lessons[i]!;
    const folderSlug = slugify(lesson.title || `lezione-${lesson.id}`);
    const folder = `${ordinalPrefix(i, folderSlug)}/`;
    const skipped = await appendLessonContent(archive, lesson, folder);
    allSkipped.push(...skipped);
  }
  if (aborted) return;
  appendManifest(archive, allSkipped);
  await archive.finalize();
}
