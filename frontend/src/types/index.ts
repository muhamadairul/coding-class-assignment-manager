export interface AdminUser {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

export interface Student {
  id: number;
  name: string;
  nis: string;
  class: '10' | '11' | string;
  total_assignments?: number;
  submitted_assignments?: number;
  not_submitted_assignments?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoredStudentSession {
  student: Student;
  token: string;
}

export interface SubmissionFile {
  id: number;
  submission_id: number;
  original_name: string;
  mime_type: string;
  file_size: number;
  is_image: boolean;
  admin_download_url: string;
  public_download_url: string;
  created_at?: string;
}

export interface SubmissionHistory {
  id: number;
  submission_id: number;
  notes: string | null;
  admin_notes: string | null;
  status: string | null;
  file_count: number;
  is_late: boolean;
  submitted_at: string;
  created_at?: string;
}

export interface Submission {
  id: number;
  student_id: number;
  assignment_id: number;
  submitted_at: string;
  status: 'submitted' | 'reviewed' | 'revision_required';
  is_late: boolean;
  timeliness_status: 'on_time' | 'late';
  notes: string | null;
  admin_notes: string | null;
  student?: Student;
  assignment?: {
    id: number;
    title: string;
    slug: string;
    class_target: string;
    deadline: string | null;
    status: string;
  };
  files?: SubmissionFile[];
  files_count?: number;
  histories?: SubmissionHistory[];
  created_at?: string;
  updated_at?: string;
}

export interface AssignmentCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export interface Assignment {
  id: number;
  category_id?: number | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  title: string;
  slug: string;
  description: string;
  instructions: string | null;
  class_target: '10' | '11' | 'all' | string;
  has_attachment: boolean;
  attachment_name: string | null;
  attachment_download_url: string | null;
  start_date: string | null;
  deadline: string | null;
  is_overdue: boolean;
  status: 'draft' | 'published' | 'archived';
  submitted_count?: number;
  not_submitted_count?: number;
  target_students_count?: number;
  student_submission?: Submission | null;
  student_task_status?: 'not_submitted' | 'submitted' | 'late';
  created_at?: string;
  updated_at?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface DashboardOverview {
  stats: {
    total_assignments: number;
    active_assignments: number;
    total_students: number;
    total_submissions: number;
    students_not_submitted: number;
    late_submissions: number;
  };
  submissions_trend: {
    date: string;
    label: string;
    count: number;
  }[];
  class_stats: {
    class: string;
    total_students: number;
    expected_submissions: number;
    submitted: number;
    not_submitted: number;
  }[];
  assignment_rates: {
    id: number;
    title: string;
    class_target: string;
    deadline: string | null;
    submitted_count: number;
    target_students: number;
    completion_rate: number;
  }[];
}
