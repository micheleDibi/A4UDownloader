import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { a4uJson } from '../services/a4uClient';
import type { Course, CourseDetail, User } from '../types';

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const USERS_CACHE_TTL_MS = 5 * 60 * 1000;

let instructorCache: { at: number; map: Map<number, string> } | null = null;

async function fetchAllPaged<T>(url: (skip: number) => string): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const items = await a4uJson<T[]>(url(skip));
    all.push(...items);
    if (items.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

async function getInstructorMap(): Promise<Map<number, string>> {
  if (instructorCache && Date.now() - instructorCache.at < USERS_CACHE_TTL_MS) {
    return instructorCache.map;
  }
  const users = await fetchAllPaged<User>(
    (skip) => `/users?skip=${skip}&limit=${PAGE_SIZE}`
  );
  const map = new Map<number, string>();
  for (const u of users) {
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    if (full) map.set(u.id, full);
    else if (u.email) map.set(u.id, u.email);
  }
  instructorCache = { at: Date.now(), map };
  return map;
}

function resolveInstructorName(
  creatorUserId: number | null | undefined,
  map: Map<number, string>
): string | null {
  if (creatorUserId == null) return null;
  return map.get(creatorUserId) ?? null;
}

coursesRouter.get('/', async (_req, res, next) => {
  try {
    const [courses, instructors] = await Promise.all([
      fetchAllPaged<Course & { creator_user_id?: number | null }>(
        (skip) => `/courses?skip=${skip}&limit=${PAGE_SIZE}`
      ),
      getInstructorMap().catch(() => new Map<number, string>()),
    ]);
    const completed = courses
      .filter((c) => c.is_completed === true)
      .map((c) => ({
        ...c,
        instructor_name: resolveInstructorName(c.creator_user_id, instructors),
      }));
    res.json({ courses: completed });
  } catch (e) {
    next(e);
  }
});

coursesRouter.get('/:id', async (req, res, next) => {
  try {
    const [course, instructors] = await Promise.all([
      a4uJson<CourseDetail & { creator_user_id?: number | null }>(
        `/courses/${encodeURIComponent(req.params.id)}`
      ),
      getInstructorMap().catch(() => new Map<number, string>()),
    ]);
    const enriched = {
      ...course,
      instructor_name: resolveInstructorName(course.creator_user_id, instructors),
    };
    res.json(enriched);
  } catch (e) {
    next(e);
  }
});
