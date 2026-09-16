import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { getLessonRecord, toPublicLesson } from '../services/db';
import { streamPdf, streamUpload } from '../services/media';
import { buildQuizCsv } from '../services/csvBuilder';
import { buildOpenQuestionsPdf } from '../services/pdfBuilder';
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
    await streamPdf(res, lesson.pdf_path, filename);
  } catch (e) {
    next(e);
  }
});

// File scaricabili della lezione per tipo:
//  - slides   → PDF delle slide (namespace generated_pdfs/)
//  - discorso → PDF del discorso temporizzato (generated_pdfs/, suffisso _speech)
//  - video    → MP4 della lezione (namespace uploads/lesson_videos/)
//  - avatar   → MP4 con avatar parlante (uploads/lesson_avatar_videos/)
lessonsRouter.get('/:id/file', async (req, res, next) => {
  try {
    const kind = String(req.query.kind ?? '');
    if (
      kind !== 'slides' &&
      kind !== 'discorso' &&
      kind !== 'video' &&
      kind !== 'avatar'
    ) {
      throw new HttpError(400, { error: 'invalid_kind' });
    }
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    const baseName = slugify(lesson.title || `lezione-${lesson.id}`);

    if (kind === 'slides') {
      if (lesson.slides_pdf_status !== 'ready' || !lesson.slides_pdf_path) {
        throw new HttpError(404, { error: 'file_not_available' });
      }
      await streamPdf(res, lesson.slides_pdf_path, `${baseName}-slides.pdf`);
      return;
    }
    if (kind === 'discorso') {
      if (lesson.speech_pdf_status !== 'ready' || !lesson.speech_pdf_path) {
        throw new HttpError(404, { error: 'file_not_available' });
      }
      await streamPdf(res, lesson.speech_pdf_path, `${baseName}-discorso.pdf`);
      return;
    }
    if (kind === 'video') {
      if (lesson.video_status !== 'ready' || !lesson.video_path) {
        throw new HttpError(404, { error: 'file_not_available' });
      }
      await streamUpload(res, lesson.video_path, `${baseName}-video.mp4`);
      return;
    }
    // kind === 'avatar'
    if (lesson.avatar_video_status !== 'ready' || !lesson.avatar_video_path) {
      throw new HttpError(404, { error: 'file_not_available' });
    }
    await streamUpload(res, lesson.avatar_video_path, `${baseName}-video-avatar.mp4`);
  } catch (e) {
    next(e);
  }
});

// Domande a scelta multipla, in CSV: opzione corretta sempre per prima.
lessonsRouter.get('/:id/quiz-chiuse.csv', async (req, res, next) => {
  try {
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    if (!lesson.is_assessment) {
      throw new HttpError(404, { error: 'not_an_assessment' });
    }
    if (!lesson.content_raw?.multiple_choice_questions?.length) {
      throw new HttpError(404, { error: 'no_closed_questions' });
    }
    const csv = buildQuizCsv(lesson.content_raw);
    const base = slugify(lesson.title || `quiz-${lesson.id}`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      contentDisposition(`${base}-domande-chiuse.csv`)
    );
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

// Domande aperte + risposta attesa, in PDF generato al volo: e' l'unico
// file prodotto da questa app (gli altri sono proxati da OVH).
lessonsRouter.get('/:id/quiz-aperte.pdf', async (req, res, next) => {
  try {
    const lesson = await getLessonRecord(req.params.id);
    if (!lesson) throw new HttpError(404, { error: 'not_found' });
    if (!lesson.is_assessment) {
      throw new HttpError(404, { error: 'not_an_assessment' });
    }
    if (!lesson.content_raw?.open_questions?.length) {
      throw new HttpError(404, { error: 'no_open_questions' });
    }
    const pdf = await buildOpenQuestionsPdf(lesson.content_raw, {
      courseTitle: lesson.course_title,
      lessonTitle: lesson.title,
    });
    const base = slugify(lesson.title || `quiz-${lesson.id}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      contentDisposition(`${base}-domande-aperte.pdf`)
    );
    res.send(pdf);
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
