import { Router } from 'express';
import { Readable } from 'node:stream';
import { requireAuth } from '../middleware/auth';
import { a4uFetch, a4uJson } from '../services/a4uClient';
import { HttpError } from '../middleware/errorHandler';
import type { Lesson, LessonDetail } from '../types';
import { contentDisposition } from '../utils/contentDisposition';
import { slugify } from '../utils/slugify';
import { buildQuizCsvForLesson } from '../services/csvBuilder';
import { streamLessonZip } from '../services/zipBuilder';

const S3_ALLOWED_HOST = 'audios-avatar.s3.eu-north-1.amazonaws.com';
const KIND_MAP = {
  slides: 'slides_pdf_url',
  video: 'slides_and_audio_video_url',
  avatar: 'slides_and_avatar_video_url',
} as const;
type Kind = keyof typeof KIND_MAP;

export const lessonsRouter = Router();
lessonsRouter.use(requireAuth);

lessonsRouter.get('/:id', async (req, res, next) => {
  try {
    const lesson = await a4uJson<LessonDetail>(
      `/lessons/${encodeURIComponent(req.params.id)}`
    );
    res.json(lesson);
  } catch (e) {
    next(e);
  }
});

lessonsRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const id = req.params.id;
    const lesson = await a4uJson<Lesson>(`/lessons/${encodeURIComponent(id)}`);
    const upstream = await a4uFetch(`/lessons/${encodeURIComponent(id)}/pdf`);
    if (!upstream.ok || !upstream.body) {
      throw new HttpError(upstream.status === 404 ? 404 : 502, {
        error: 'pdf_unavailable',
      });
    }
    const filename = `${slugify(lesson.title || `lezione-${id}`)}.pdf`;
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/pdf'
    );
    res.setHeader('Content-Disposition', contentDisposition(filename));
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    Readable.fromWeb(upstream.body as never).pipe(res);
  } catch (e) {
    next(e);
  }
});

lessonsRouter.get('/:id/file', async (req, res, next) => {
  try {
    const kind = String(req.query.kind ?? '') as Kind;
    if (!(kind in KIND_MAP)) {
      throw new HttpError(400, { error: 'invalid_kind' });
    }
    const lesson = await a4uJson<Lesson>(
      `/lessons/${encodeURIComponent(req.params.id)}`
    );
    const fieldName = KIND_MAP[kind];
    const url = lesson[fieldName];
    if (!url) throw new HttpError(404, { error: 'file_not_available' });
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new HttpError(502, { error: 'invalid_upstream_url' });
    }
    if (parsed.host !== S3_ALLOWED_HOST) {
      throw new HttpError(502, { error: 'untrusted_upstream_host' });
    }
    res.redirect(302, url);
  } catch (e) {
    next(e);
  }
});

lessonsRouter.get('/:id/quiz.csv', async (req, res, next) => {
  try {
    const id = req.params.id;
    const lesson = await a4uJson<LessonDetail>(`/lessons/${encodeURIComponent(id)}`);
    const csv = await buildQuizCsvForLesson(lesson);
    const filename = `${slugify(lesson.title || `quiz-${id}`)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(filename));
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

lessonsRouter.get('/:id/all.zip', async (req, res, next) => {
  try {
    const lesson = await a4uJson<LessonDetail>(
      `/lessons/${encodeURIComponent(req.params.id)}`
    );
    await streamLessonZip(req, res, lesson);
  } catch (e) {
    next(e);
  }
});
