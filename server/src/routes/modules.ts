import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import {
  getModuleContentLessons,
  getModuleDetail,
  getModuleWithRecords,
} from '../services/db';
import { bulkSet } from '../services/approvalsDb';
import { isStatus, parseNote } from '../utils/approvals';
import { streamModuleZip } from '../services/zipBuilder';

export const modulesRouter = Router();
modulesRouter.use(requireAuth);

modulesRouter.get('/:id', async (req, res, next) => {
  try {
    const mod = await getModuleDetail(req.params.id);
    if (!mod) throw new HttpError(404, { error: 'not_found' });
    res.json(mod);
  } catch (e) {
    next(e);
  }
});

modulesRouter.get('/:id/all.zip', async (req, res, next) => {
  try {
    const mod = await getModuleWithRecords(req.params.id);
    if (!mod) throw new HttpError(404, { error: 'not_found' });
    await streamModuleZip(req, res, mod);
  } catch (e) {
    next(e);
  }
});

// Azione massiva sull'intero modulo (dispense + slide insieme).
modulesRouter.post('/:id/approvals', async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!isStatus(status)) throw new HttpError(400, { error: 'invalid_status' });
    const lessons = await getModuleContentLessons(req.params.id);
    if (lessons.length === 0) throw new HttpError(404, { error: 'not_found' });
    const courseId = lessons[0]!.course_id;
    bulkSet(
      lessons.map((l) => ({ lesson_id: l.id, module_id: req.params.id })),
      courseId,
      status,
      parseNote(req.body?.note)
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
