import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { getModuleDetail, getModuleWithRecords } from '../services/db';
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
