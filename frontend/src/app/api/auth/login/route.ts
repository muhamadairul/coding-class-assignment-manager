import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  cookieOptions,
  getBackendApiBaseUrl,
} from '@/lib/bff';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const upstream = await fetch(`${getBackendApiBaseUrl()}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const token = payload?.data?.token as string | undefined;
  const user = payload?.data?.user;

  const response = NextResponse.json(
    {
      success: true,
      message: payload.message || 'Login berhasil.',
      data: { user },
      meta: null,
    },
    { status: 200 }
  );

  if (token) {
    response.cookies.set(ADMIN_COOKIE_NAME, token, cookieOptions(60 * 60 * 24 * 7));
  }

  return response;
}
