'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Code2, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminLoginSchema, type AdminLoginValues } from '@/lib/validators';
import { adminApi, bffApi, extractApiError } from '@/lib/api';
import { setAdminUserHint } from '@/lib/storage';
import type { AdminUser } from '@/types';

export default function AdminLoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    adminApi
      .get<{ data: AdminUser }>('/admin/me')
      .then((res) => {
        setAdminUserHint(res.data.data);
        router.replace('/admin/dashboard');
      })
      .catch(() => null);
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: AdminLoginValues) => {
    setSubmitting(true);
    try {
      const res = await bffApi.post<{
        message: string;
        data: { user: AdminUser };
      }>('/auth/login', values);

      setAdminUserHint(res.data.data.user);
      toast.success('Login berhasil! Selamat datang kembali.');
      router.replace('/admin/dashboard');
    } catch (err) {
      toast.error(extractApiError(err, 'Email atau password salah.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
          <Code2 className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <span className="block text-base font-bold text-slate-900">Coding Class</span>
          <span className="block text-xs text-slate-500">Assignment Manager</span>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Masuk Portal Guru / Admin</CardTitle>
          <CardDescription>
            Gunakan akun admin untuk mengelola tugas dan memonitor pengumpulan siswa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input
                type="email"
                placeholder="admin@codingclass.local"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              <Lock className="h-4 w-4" />
              {submitting ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Portal Siswa
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
