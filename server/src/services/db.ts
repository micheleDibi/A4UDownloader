import { Pool } from 'pg';
import { config } from '../config';
import type {
  Course,
  CourseDetail,
  Lesson,
  LessonAssessmentContent,
  ModuleDetail,
  ModuleSummary,
} from '../types';

// node-postgres vuole `postgres(ql)://`; la stringa di a4u è in formato
// SQLAlchemy (`postgresql+asyncpg://...`). Normalizziamo togliendo `+driver`.
const connectionString = config.databaseUrl.replace(
  /^(postgres(?:ql)?)\+\w+:\/\//,
  '$1://'
);

export const pool = new Pool({ connectionString });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

// ---------------------------------------------------------------------------
// Corsi "completi" dell'organizzazione configurata
// ---------------------------------------------------------------------------
// Un corso è completo quando, per OGNI lezione non-assessment, dispensa e
// slide sono pronte (`*_status='ready'` + path valorizzato) e — se le verifiche
// sono abilitate — ogni lezione assessment ha il quiz pronto.
const COURSE_SELECT = `
  SELECT c.id::text AS id,
         c.title,
         c.cfu,
         c.language_code,
         c.lesson_duration_minutes,
         u.full_name AS instructor_name,
         COUNT(cl.id)::int AS lessons_count,
         COUNT(*) FILTER (WHERE NOT cl.is_assessment)::int AS content_lessons_count,
         COUNT(*) FILTER (
           WHERE NOT cl.is_assessment
             AND cl.video_status = 'ready' AND cl.video_path IS NOT NULL
         )::int AS video_count,
         COUNT(*) FILTER (
           WHERE NOT cl.is_assessment
             AND cl.avatar_video_status = 'ready' AND cl.avatar_video_path IS NOT NULL
         )::int AS avatar_count
  FROM course c
  JOIN organizations o ON o.id = c.organization_id AND o.name = $1
  LEFT JOIN users u ON u.id = c.assignee_user_id
  JOIN course_lesson cl ON cl.course_id = c.id
  WHERE NOT EXISTS (
          SELECT 1 FROM course_lesson x
          WHERE x.course_id = c.id AND x.is_assessment = false
            AND (x.pdf_status <> 'ready' OR x.pdf_path IS NULL
              OR x.slides_pdf_status <> 'ready' OR x.slides_pdf_path IS NULL))
    AND (NOT c.assessment_lesson_enabled OR NOT EXISTS (
          SELECT 1 FROM course_lesson x
          WHERE x.course_id = c.id AND x.is_assessment = true
            AND x.content_status NOT IN ('ready', 'approved')))
    AND EXISTS (
          SELECT 1 FROM course_lesson x
          WHERE x.course_id = c.id AND x.is_assessment = false)`;

const COURSE_GROUP = ` GROUP BY c.id, u.full_name`;

interface CourseRow {
  id: string;
  title: string;
  cfu: number | null;
  language_code: string | null;
  lesson_duration_minutes: number | null;
  instructor_name: string | null;
  lessons_count: number;
  content_lessons_count: number;
  video_count: number;
  avatar_count: number;
}

// Course + conteggi degli asset approvabili (per il riepilogo approvazioni:
// asset totali = content_lessons_count × 2 + video presenti + avatar presenti).
export interface CourseWithMeta extends Course {
  content_lessons_count: number;
  video_count: number;
  avatar_count: number;
}

function mapCourse(row: CourseRow): Course {
  const duration =
    row.lesson_duration_minutes != null
      ? row.lesson_duration_minutes * row.lessons_count
      : null;
  return {
    id: row.id,
    name: row.title,
    title: row.title,
    cfu: row.cfu,
    language: row.language_code,
    duration_minutes: duration,
    instructor_name: row.instructor_name,
    is_completed: true,
  };
}

export async function listCompleteCourses(): Promise<CourseWithMeta[]> {
  const res = await pool.query<CourseRow>(
    `${COURSE_SELECT}${COURSE_GROUP} ORDER BY c.title`,
    [config.orgName]
  );
  return res.rows.map((r) => ({
    ...mapCourse(r),
    content_lessons_count: r.content_lessons_count,
    video_count: r.video_count,
    avatar_count: r.avatar_count,
  }));
}

export async function getCourseDetail(id: string): Promise<CourseDetail | null> {
  if (!isUuid(id)) return null;
  const courseRes = await pool.query<CourseRow>(
    `${COURSE_SELECT} AND c.id = $2${COURSE_GROUP}`,
    [config.orgName, id]
  );
  const row = courseRes.rows[0];
  if (!row) return null;

  const modulesRes = await pool.query<{
    id: string;
    title: string;
    position: number;
  }>(
    `SELECT id::text AS id, title, position
     FROM course_module WHERE course_id = $1 ORDER BY position`,
    [id]
  );
  const modules: ModuleSummary[] = modulesRes.rows.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.position,
  }));
  return { ...mapCourse(row), modules };
}

// ---------------------------------------------------------------------------
// Lezioni (record completo con path file + content_raw del quiz)
// ---------------------------------------------------------------------------
export interface LessonRecord {
  id: string;
  title: string;
  position: number;
  is_assessment: boolean;
  pdf_status: string;
  pdf_path: string | null;
  slides_pdf_status: string;
  slides_pdf_path: string | null;
  content_status: string;
  content_raw: LessonAssessmentContent | null;
  video_status: string;
  video_path: string | null;
  avatar_video_status: string;
  avatar_video_path: string | null;
}

const LESSON_RECORD_COLS = `
  cl.id::text AS id, cl.title, cl.position, cl.is_assessment,
  cl.pdf_status, cl.pdf_path,
  cl.slides_pdf_status, cl.slides_pdf_path,
  cl.content_status, cl.content_raw,
  cl.video_status, cl.video_path,
  cl.avatar_video_status, cl.avatar_video_path`;

export function toPublicLesson(r: LessonRecord): Lesson {
  return {
    id: r.id,
    title: r.title,
    order: r.position,
    lesson_type: r.is_assessment ? 'ASSESSMENT' : 'CONTENT',
    is_assessment: r.is_assessment,
    dispensa_available: r.pdf_status === 'ready' && !!r.pdf_path,
    slides_available: r.slides_pdf_status === 'ready' && !!r.slides_pdf_path,
    video_available: r.video_status === 'ready' && !!r.video_path,
    avatar_video_available:
      r.avatar_video_status === 'ready' && !!r.avatar_video_path,
  };
}

export async function getLessonRecord(id: string): Promise<LessonRecord | null> {
  if (!isUuid(id)) return null;
  const res = await pool.query<LessonRecord>(
    `SELECT ${LESSON_RECORD_COLS} FROM course_lesson cl WHERE cl.id = $1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export interface ModuleWithRecords {
  id: string;
  title: string;
  position: number;
  lessons: LessonRecord[];
}

export async function getModuleWithRecords(
  id: string
): Promise<ModuleWithRecords | null> {
  if (!isUuid(id)) return null;
  const modRes = await pool.query<{
    id: string;
    title: string;
    position: number;
  }>(
    `SELECT id::text AS id, title, position FROM course_module WHERE id = $1`,
    [id]
  );
  const mod = modRes.rows[0];
  if (!mod) return null;
  const lessonsRes = await pool.query<LessonRecord>(
    `SELECT ${LESSON_RECORD_COLS} FROM course_lesson cl
     WHERE cl.module_id = $1 ORDER BY cl.position`,
    [id]
  );
  return {
    id: mod.id,
    title: mod.title,
    position: mod.position,
    lessons: lessonsRes.rows,
  };
}

export async function getModuleDetail(id: string): Promise<ModuleDetail | null> {
  const mod = await getModuleWithRecords(id);
  if (!mod) return null;
  return {
    id: mod.id,
    title: mod.title,
    order: mod.position,
    lessons: mod.lessons.map(toPublicLesson),
  };
}

// ---------------------------------------------------------------------------
// Helper per le approvazioni: elenco lezioni di CONTENUTO (no assessment) e
// proprietà di una lezione. Usati per le azioni massive e per i totali.
// ---------------------------------------------------------------------------
// Espressioni SQL che indicano se video/avatar sono pronti su OVH.
const AVAILABILITY_COLS = `
  (cl.video_status = 'ready' AND cl.video_path IS NOT NULL) AS video_available,
  (cl.avatar_video_status = 'ready' AND cl.avatar_video_path IS NOT NULL) AS avatar_available`;

export interface ContentLessonAssets {
  id: string;
  course_id: string;
  module_id: string;
  video_available: boolean;
  avatar_available: boolean;
}

export async function getCourseContentLessons(
  courseId: string
): Promise<ContentLessonAssets[]> {
  if (!isUuid(courseId)) return [];
  const res = await pool.query<ContentLessonAssets>(
    `SELECT cl.id::text AS id, cl.course_id::text AS course_id,
            cl.module_id::text AS module_id,${AVAILABILITY_COLS}
     FROM course_lesson cl WHERE cl.course_id = $1 AND cl.is_assessment = false`,
    [courseId]
  );
  return res.rows;
}

export async function getModuleContentLessons(
  moduleId: string
): Promise<ContentLessonAssets[]> {
  if (!isUuid(moduleId)) return [];
  const res = await pool.query<ContentLessonAssets>(
    `SELECT cl.id::text AS id, cl.course_id::text AS course_id,
            cl.module_id::text AS module_id,${AVAILABILITY_COLS}
     FROM course_lesson cl WHERE cl.module_id = $1 AND cl.is_assessment = false`,
    [moduleId]
  );
  return res.rows;
}

export interface LessonOwnership {
  id: string;
  course_id: string;
  module_id: string;
  is_assessment: boolean;
}

export async function getLessonOwnership(
  lessonId: string
): Promise<LessonOwnership | null> {
  if (!isUuid(lessonId)) return null;
  const res = await pool.query<LessonOwnership>(
    `SELECT id::text AS id, course_id::text AS course_id,
            module_id::text AS module_id, is_assessment
     FROM course_lesson WHERE id = $1`,
    [lessonId]
  );
  return res.rows[0] ?? null;
}
