export type LessonType = 'CONTENT' | 'ASSESSMENT' | (string & {});

export interface Course {
  id: string;
  name: string;
  title?: string | null;
  language?: string | null;
  duration_minutes?: number | null;
  is_completed: boolean;
  cfu?: number | null;
  corso_di_laurea?: string | null;
  instructor_name?: string | null;
}

export interface ModuleSummary {
  id: string;
  title: string;
  order?: number | null;
}

export interface CourseDetail extends Course {
  modules: ModuleSummary[];
}

export interface Lesson {
  id: string;
  title: string;
  lesson_type?: LessonType | null;
  order?: number | null;
  is_assessment?: boolean;
  dispensa_available?: boolean;
  slides_available?: boolean;
  discorso_available?: boolean;
  video_available?: boolean;
  avatar_video_available?: boolean;
  closed_questions_available?: boolean;
  open_questions_available?: boolean;
}

export interface ModuleDetail extends ModuleSummary {
  lessons: Lesson[];
}
