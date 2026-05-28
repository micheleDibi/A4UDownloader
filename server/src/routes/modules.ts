import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { a4uJson } from '../services/a4uClient';
import type { ModuleDetail } from '../types';
import { streamModuleZip } from '../services/zipBuilder';

export const modulesRouter = Router();
modulesRouter.use(requireAuth);

modulesRouter.get('/:id', async (req, res, next) => {
  try {
    const mod = await a4uJson<ModuleDetail>(
      `/modules/${encodeURIComponent(req.params.id)}`
    );
    res.json(mod);
  } catch (e) {
    next(e);
  }
});

modulesRouter.get('/:id/all.zip', async (req, res, next) => {
  try {
    const mod = await a4uJson<ModuleDetail>(
      `/modules/${encodeURIComponent(req.params.id)}`
    );
    await streamModuleZip(req, res, mod);
  } catch (e) {
    next(e);
  }
});
