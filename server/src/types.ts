export type LessonType = 'CONTENT' | 'ASSESSMENT' | (string & {});

export interface Course {
  id: string;
  name: string;
  title: string;
  language?: string | null;
  duration_minutes?: number | null;
  is_completed: boolean;
  cfu?: number | null;
  instructor_name?: string | null;
  approval_summary?: ApprovalSummary;
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
  lesson_type: LessonType;
  order?: number | null;
  is_assessment: boolean;
  dispensa_available: boolean;
  slides_available: boolean;
  video_available: boolean;
  avatar_video_available: boolean;
}

export interface ModuleDetail extends ModuleSummary {
  lessons: Lesson[];
}

// --- Quiz (course_lesson.content_raw quando is_assessment) ---
// Mirror di LessonAssessmentOutput (a4u/backend/app/schemas/course_lesson_content.py).
export interface AssessmentMCOption {
  option_id: string;
  text: string;
}

export interface AssessmentMCQuestion {
  question_id: string;
  text: string;
  options: AssessmentMCOption[];
  correct_option_id: string;
}

export interface AssessmentOpenQuestion {
  question_id: string;
  text: string;
  expected_answer: string;
}

export interface LessonAssessmentContent {
  multiple_choice_questions?: AssessmentMCQuestion[];
  open_questions?: AssessmentOpenQuestion[];
}

// --- Approvazioni (DB locale del downloader) ---
export type AssetType = 'dispensa' | 'slides';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
// Stato realmente persistito (pending = riga assente).
export type StoredApprovalStatus = 'approved' | 'rejected';

export interface Approval {
  lesson_id: string;
  asset_type: AssetType;
  status: StoredApprovalStatus;
  note: string | null;
  updated_at: string;
}

export interface ApprovalSummary {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}
