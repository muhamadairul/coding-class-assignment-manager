import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  cookieOptions,
  getBackendApiBaseUrl,
  getCookieToken,
  STUDENT_COOKIE_NAME,
} from '@/lib/bff';

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const joinedPath = path.join('/');
  const search = request.nextUrl.search || '';
  const targetUrl = `${getBackendApiBaseUrl()}/${joinedPath}${search}`;

  const headers = new Headers();
  headers.set('Accept', request.headers.get('accept') || 'application/json');

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  if (joinedPath.startsWith('admin/')) {
    const adminToken = await getCookieToken(ADMIN_COOKIE_NAME);
    if (adminToken) {
      headers.set('Authorization', `Bearer ${adminToken}`);
    }
  } else if (joinedPath.startsWith('public/')) {
    const studentToken = await getCookieToken(STUDENT_COOKIE_NAME);
    if (studentToken) {
      headers.set('X-Student-Token', studentToken);
    }
  }

  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);
  const bodyBuffer = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body: bodyBuffer ? Buffer.from(bodyBuffer) : undefined,
    redirect: 'manual',
  });

  const upstreamContentType = upstream.headers.get('content-type') || '';

  // Intercept JSON response for public/submissions to store HttpOnly student token securely
  if (
    method === 'POST' &&
    joinedPath === 'public/submissions' &&
    upstream.ok &&
    upstreamContentType.includes('application/json')
  ) {
    const payload = await upstream.json();
    const studentToken = payload?.data?.student_token as string | undefined;
    if (payload?.data && 'student_token' in payload.data) {
      delete payload.data.student_token;
    }

    const res = NextResponse.json(payload, { status: upstream.status });
    if (studentToken) {
      res.cookies.set(
        STUDENT_COOKIE_NAME,
        studentToken,
        cookieOptions(60 * 60 * 24 * 30)
      );
    }
    return res;
  }

  const resHeaders = new Headers();
  if (upstreamContentType) resHeaders.set('Content-Type', upstreamContentType);
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) resHeaders.set('Content-Disposition', disposition);
  const cacheControl = upstream.headers.get('cache-control');
  if (cacheControl) resHeaders.set('Cache-Control', cacheControl);

  const responseBuffer = await upstream.arrayBuffer();

  return new NextResponse(responseBuffer, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
