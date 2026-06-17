import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { getCourseDetail, listCompleteCourses } from '../services/db';

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
