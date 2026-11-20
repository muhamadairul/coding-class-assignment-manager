import axios, { AxiosError } from 'axios';

// All requests route through Next.js BFF (/api/proxy) so HttpOnly cookies are attached server-side
export const adminApi = axios.create({
  baseURL: '/api/proxy',
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true,
});

export const publicApi = axios.create({
  baseURL: '/api/proxy',
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true,
});

export const bffApi = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true,
});

export function extractApiError(
  error: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.'
): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{
      message?: string;
      errors?: Record<string, string[]>;
    }>;
    const data = axiosErr.response?.data;
    if (data?.errors) {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && data.errors[firstKey]?.[0]) {
        return data.errors[firstKey][0];
      }
    }
    if (data?.message) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
