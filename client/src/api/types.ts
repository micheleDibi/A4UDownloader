export type LessonType = 'CONTENT' | 'ASSESSMENT' | (string & {});

export interface Course {
  id: string;
  name: string;
  title?: string | null;
  language?: string | null;
  duration_minutes?: number | null;
  is_completed: boolean;
  cfu?: number | null;
  instructor_name?: string | null;
  approval_summary?: ApprovalSummary;
}

// --- Approvazioni ---
export type AssetType = 'dispensa' | 'slides' | 'video' | 'avatar';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  lesson_id: string;
  asset_type: AssetType;
  status: 'approved' | 'rejected';
  note: string | null;
  updated_at: string;
}

export interface ApprovalSummary {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface CourseApprovals {
  approvals: Approval[];
  summary: ApprovalSummary;
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
  video_available?: boolean;
  avatar_video_available?: boolean;
}

export interface ModuleDetail extends ModuleSummary {
  lessons: Lesson[];
}
