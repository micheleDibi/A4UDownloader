import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import {
  getCourseContentLessons,
  getCourseDetail,
  listCompleteCourses,
} from '../services/db';
import {
  bulkSet,
  countsByCourse,
  getApprovalsForCourse,
} from '../services/approvalsDb';
import { buildSummary, isStatus, parseNote } from '../utils/approvals';

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

coursesRouter.get('/', async (_req, res, next) => {
  try {
    const courses = await listCompleteCourses();
    const counts = countsByCourse(courses.map((c) => c.id));
    const withSummary = courses.map(({ content_lessons_count, ...rest }) => {
      const total = content_lessons_count * 2;
      const cc = counts.get(rest.id) ?? { approved: 0, rejected: 0 };
      return {
        ...rest,
        approval_summary: {
          total,
          approved: cc.approved,
          rejected: cc.rejected,
          pending: Math.max(0, total - cc.approved - cc.rejected),
        },
      };
    });
    res.json({ courses: withSummary });
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

// Stato approvazioni del corso + riepilogo.
coursesRouter.get('/:id/approvals', async (req, res, next) => {
  try {
    const course = await getCourseDetail(req.params.id);
    if (!course) throw new HttpError(404, { error: 'not_found' });
    const content = await getCourseContentLessons(req.params.id);
    const approvals = getApprovalsForCourse(req.params.id);
    res.json({ approvals, summary: buildSummary(content.length * 2, approvals) });
  } catch (e) {
    next(e);
  }
});

// Azione massiva sull'intero corso (dispense + slide insieme).
coursesRouter.post('/:id/approvals', async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!isStatus(status)) throw new HttpError(400, { error: 'invalid_status' });
    const course = await getCourseDetail(req.params.id);
    if (!course) throw new HttpError(404, { error: 'not_found' });
    const content = await getCourseContentLessons(req.params.id);
    bulkSet(
      content.map((l) => ({ lesson_id: l.id, module_id: l.module_id })),
      req.params.id,
      status,
      parseNote(req.body?.note)
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
