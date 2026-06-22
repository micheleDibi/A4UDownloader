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
import {
  approvableAssetTypes,
  buildSummary,
  isStatus,
  parseNote,
} from '../utils/approvals';
import type { ContentLessonAssets } from '../services/db';

// Asset approvabili totali per un insieme di lezioni di contenuto:
// 2 per lezione (dispensa+slide) + 1 per ogni video/avatar presente.
function totalAssets(lessons: ContentLessonAssets[]): number {
  return lessons.reduce(
    (s, l) => s + 2 + (l.video_available ? 1 : 0) + (l.avatar_available ? 1 : 0),
    0
  );
}

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

coursesRouter.get('/', async (_req, res, next) => {
  try {
    const courses = await listCompleteCourses();
    const counts = countsByCourse(courses.map((c) => c.id));
    const withSummary = courses.map(
      ({ content_lessons_count, video_count, avatar_count, ...rest }) => {
      const total = content_lessons_count * 2 + video_count + avatar_count;
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
    res.json({ approvals, summary: buildSummary(totalAssets(content), approvals) });
  } catch (e) {
    next(e);
  }
});

// Azione massiva sull'intero corso (dispense + slide + eventuali video).
coursesRouter.post('/:id/approvals', async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!isStatus(status)) throw new HttpError(400, { error: 'invalid_status' });
    const course = await getCourseDetail(req.params.id);
    if (!course) throw new HttpError(404, { error: 'not_found' });
    const content = await getCourseContentLessons(req.params.id);
    bulkSet(
      content.map((l) => ({
        lesson_id: l.id,
        module_id: l.module_id,
        asset_types: approvableAssetTypes(l),
      })),
      req.params.id,
      status,
      parseNote(req.body?.note)
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
