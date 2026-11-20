import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  getBackendApiBaseUrl,
  getCookieToken,
} from '@/lib/bff';

export async function POST() {
  const token = await getCookieToken(ADMIN_COOKIE_NAME);

  if (token) {
    await fetch(`${getBackendApiBaseUrl()}/admin/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }).catch(() => null);
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil.',
    data: null,
    meta: null,
  });

  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
