import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { getLessonRecord, toPublicLesson } from '../services/db';
import { streamMedia } from '../services/media';
import { buildQuizCsv } from '../services/csvBuilder';
import { streamLessonZip } from '../services/zipBuilder';
import { contentDisposition } from '../utils/contentDisposition';
import { slugify } from '../utils/slugify';

export const lessonsRouter = Router();
lessonsRouter.use(requireAuth);

lessonsRouter.get('/:id', async (req, res, next) => {
  try {
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    res.json(toPublicLesson(lesson));
  } catch (e) {
    next(e);
  }
});

// Dispensa (PDF della lezione).
lessonsRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    if (lesson.pdf_status !== 'ready' || !lesson.pdf_path) {
      throw new HttpError(404, { error: 'pdf_unavailable' });
    }
    const filename = `${slugify(lesson.title || `lezione-${lesson.id}`)}.pdf`;
    await streamMedia(res, lesson.pdf_path, filename);
  } catch (e) {
    next(e);
  }
});

// Slide (PDF). Resta `?kind=slides` per compatibilità col frontend; gli altri
// kind (video/avatar) non sono più supportati.
lessonsRouter.get('/:id/file', async (req, res, next) => {
  try {
    const kind = String(req.query.kind ?? '');
    if (kind !== 'slides') {
      throw new HttpError(400, { error: 'invalid_kind' });
    }
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    if (lesson.slides_pdf_status !== 'ready' || !lesson.slides_pdf_path) {
      throw new HttpError(404, { error: 'file_not_available' });
    }
    const filename = `${slugify(lesson.title || `lezione-${lesson.id}`)}-slides.pdf`;
    await streamMedia(res, lesson.slides_pdf_path, filename);
  } catch (e) {
    next(e);
  }
});

lessonsRouter.get('/:id/quiz.csv', async (req, res, next) => {
  try {
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    const csv = buildQuizCsv(lesson.content_raw);
    const filename = `${slugify(lesson.title || `quiz-${lesson.id}`)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(filename));
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

lessonsRouter.get('/:id/all.zip', async (req, res, next) => {
  try {
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    await streamLessonZip(req, res, lesson);
  } catch (e) {
    next(e);
  }
});
