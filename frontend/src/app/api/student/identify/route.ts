import { NextRequest, NextResponse } from 'next/server';
import {
  cookieOptions,
  getBackendApiBaseUrl,
  STUDENT_COOKIE_NAME,
} from '@/lib/bff';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const upstream = await fetch(`${getBackendApiBaseUrl()}/public/students/identify`, {
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

  const token = payload?.data?.student_token as string | undefined;
  const student = payload?.data?.student;
  const status = payload?.data?.status;

  const response = NextResponse.json(
    {
      success: true,
      message: payload.message,
      data: { student, status },
      meta: null,
    },
    { status: upstream.status }
  );

  if (token) {
    response.cookies.set(
      STUDENT_COOKIE_NAME,
      token,
      cookieOptions(60 * 60 * 24 * 30)
    );
  }

  return response;
}
