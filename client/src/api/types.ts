export type LessonType = 'CONTENT' | 'ASSESSMENT' | (string & {});

export interface Course {
  id: number;
  name: string;
  title?: string | null;
  language?: string | null;
  duration_minutes?: number | null;
  course_type?: string | null;
  is_completed: boolean;
}

export interface ModuleSummary {
  id: number;
  title: string;
  duration_minutes?: number | null;
  order?: number | null;
}

export interface CourseDetail extends Course {
  modules: ModuleSummary[];
}

export interface Lesson {
  id: number;
  title: string;
  lesson_type?: LessonType | null;
  duration_minutes?: number | null;
  order?: number | null;
  slides_pdf_url?: string | null;
  slides_and_audio_video_url?: string | null;
  slides_and_avatar_video_url?: string | null;
}

export interface ModuleDetail extends ModuleSummary {
  lessons: Lesson[];
}
