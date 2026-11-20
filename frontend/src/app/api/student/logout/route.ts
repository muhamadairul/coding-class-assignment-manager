import { NextResponse } from 'next/server';
import { STUDENT_COOKIE_NAME } from '@/lib/bff';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sesi siswa dihapus dari browser.',
    data: null,
    meta: null,
  });

  response.cookies.set(STUDENT_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
