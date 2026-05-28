import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { a4uJson } from '../services/a4uClient';
import type { Course, CourseDetail } from '../types';

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

coursesRouter.get('/', async (_req, res, next) => {
  try {
    const all: Course[] = [];
    let skip = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const items = await a4uJson<Course[]>(`/courses?skip=${skip}&limit=${PAGE_SIZE}`);
      all.push(...items);
      if (items.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }
    const completed = all.filter((c) => c.is_completed === true);
    res.json({ courses: completed });
  } catch (e) {
    next(e);
  }
});

coursesRouter.get('/:id', async (req, res, next) => {
  try {
    const course = await a4uJson<CourseDetail>(
      `/courses/${encodeURIComponent(req.params.id)}`
    );
    res.json(course);
  } catch (e) {
    next(e);
  }
});
