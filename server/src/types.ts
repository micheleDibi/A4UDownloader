export type LessonType = 'CONTENT' | 'ASSESSMENT' | (string & {});

export interface Course {
  id: number;
  name: string;
  title?: string | null;
  language?: string | null;
  duration_minutes?: number | null;
  course_type?: string | null;
  is_completed: boolean;
  is_draft?: boolean;
  cfu?: number | null;
  banner_image_url?: string | null;
}

export interface CourseDetail extends Course {
  modules: ModuleList[];
}

export interface User {
  id: number;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

export interface ModuleList {
  id: number;
  title: string;
  duration_minutes?: number | null;
  order?: number | null;
  course_id?: number | null;
}

export interface ModuleDetail extends ModuleList {
  lessons: Lesson[];
}

export interface Lesson {
  id: number;
  title: string;
  lesson_type?: LessonType | null;
  duration_minutes?: number | null;
  order?: number | null;
  module_id?: number | null;
  slides_pdf_url?: string | null;
  slides_and_audio_video_url?: string | null;
  slides_and_avatar_video_url?: string | null;
  avatar_video_url?: string | null;
  mp4_video_url?: string | null;
}

export interface LessonDetail extends Lesson {
  sections?: unknown[];
  quizzes?: Quiz[];
  open_questions?: unknown[];
}

export interface Quiz {
  id: number;
  title?: string | null;
  lesson_id?: number | null;
}

export interface QuizQuestion {
  id: number;
  question_text: string;
  difficulty?: string | null;
  quiz_id?: number | null;
  origin_lesson?: number | null;
  order?: number | null;
}

export interface QuizOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  quiz_question_id?: number | null;
}

export interface QuizQuestionDetail extends QuizQuestion {
  options: QuizOption[];
}
