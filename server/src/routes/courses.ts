import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import {
  getCourseClosedQuestions,
  getCourseDetail,
  listCompleteCourses,
} from '../services/db';
import { buildPaniereRows, buildPaniereXlsx } from '../services/xlsxBuilder';
import { contentDisposition } from '../utils/contentDisposition';
import { slugify } from '../utils/slugify';

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

coursesRouter.get('/', async (_req, res, next) => {
  try {
    const courses = await listCompleteCourses();
    res.json({ courses });
  } catch (e) {
    next(e);
  }
});

coursesRouter.get('/:id', async (req, res, next) => {
  try {
    const course = await getCourseDetail(req.params.id);
    if (!course) throw new HttpError(404, { error: 'not_found' });
    res.json(course);
  } catch (e) {
    next(e);
  }
});

// Paniere eCampus dell'intero corso, in un unico .xlsx: 10 domande chiuse
// estratte a caso da ogni modulo. A ogni download l'estrazione cambia.
coursesRouter.get('/:id/paniere-ecampus.xlsx', async (req, res, next) => {
  try {
    const course = await getCourseDetail(req.params.id);
    if (!course) throw new HttpError(404, { error: 'not_found' });
    const rows = buildPaniereRows(await getCourseClosedQuestions(course.id));
    if (!rows.length) throw new HttpError(404, { error: 'no_closed_questions' });
    const xlsx = await buildPaniereXlsx(rows);
    // Nome file: titolo corso, corso di laurea (se presente) e CFU.
    const nameParts = [
      slugify(course.title || `corso-${course.id}`),
      course.corso_di_laurea?.trim() ? slugify(course.corso_di_laurea) : null,
      course.cfu != null ? `${course.cfu}-CFU` : null,
      'paniere-ecampus',
    ].filter(Boolean);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      contentDisposition(`${nameParts.join('_')}.xlsx`)
    );
    res.send(xlsx);
  } catch (e) {
    next(e);
  }
});
