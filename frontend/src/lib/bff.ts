import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'ccam_admin_token';
export const STUDENT_COOKIE_NAME = 'ccam_student_token';

export function getBackendApiBaseUrl(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000/api/v1'
  ).replace(/\/$/, '');
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function getCookieToken(name: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(name)?.value;
}
