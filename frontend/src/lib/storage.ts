import type { AdminUser, Student } from '@/types';

// Only non-sensitive profile display hints are cached locally.
// Sensitive Bearer & Student access tokens live exclusively in HttpOnly cookies managed by Next.js BFF.
const ADMIN_USER_KEY = 'ccam_admin_user_hint';
const STUDENT_PROFILE_KEY = 'ccam_student_profile_hint';

export function setAdminUserHint(user: AdminUser): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

export function getAdminUserHint(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function clearAdminUserHint(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_USER_KEY);
}

export function getStudentProfileHint(): Student | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDENT_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Student) : null;
  } catch {
    return null;
  }
}

export function setStudentProfileHint(student: Student): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(student));
}

export function clearStudentProfileHint(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STUDENT_PROFILE_KEY);
}
