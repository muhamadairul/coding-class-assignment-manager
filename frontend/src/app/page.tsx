'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardList,
  Upload,
  CheckCircle2,
  UserCheck,
  FileUp,
  Clock,
  Terminal,
} from 'lucide-react';
import { StudentShell } from '@/components/layout/student-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClassTargetBadge } from '@/components/ui/status-badges';
import { publicApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Assignment, PaginatedResponse } from '@/types';

export default function StudentLandingPage() {
  const [recentTasks, setRecentTasks] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    publicApi
      .get<PaginatedResponse<Assignment>>('/public/assignments', {
        params: { per_page: 3 },
      })
      .then((res) => setRecentTasks(res.data.data))
      .catch(() => setRecentTasks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell>
      <div className="space-y-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-6 shadow-xs sm:p-10">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              <Terminal className="h-3.5 w-3.5" />
              Ekstrakurikuler Coding · Kelas 10 &amp; 11
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Coding Class Assignment Manager
            </h1>
            <p className="text-base leading-relaxed text-slate-600">
              Platform pengumpulan dan pemantauan tugas ekstrakurikuler coding. Cek daftar
              tugas aktif, unggah hasil proyekmu (gambar, dokumen, atau arsip ZIP), dan
              pantau status pemeriksaan dari guru tanpa perlu membuat akun.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href="/tasks">
                <Button size="lg">
                  <ClipboardList className="h-4 w-4" />
                  Lihat Daftar Tugas
                </Button>
              </Link>
              <Link href="/submit">
                <Button size="lg" variant="outline">
                  <Upload className="h-4 w-4" />
                  Kumpulkan Tugas
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Cara Pengumpulan */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Cara Mengumpulkan Tugas
            </h2>
            <p className="text-sm text-slate-500">
              Cukup gunakan NIS milikmu — data siswa tercatat otomatis saat pertama kali mengumpulkan.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5 space-y-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">1. Masukkan Identitas NIS</h3>
                <p className="text-sm text-slate-600">
                  Isi Nama Lengkap, NIS, dan Kelas (10 atau 11). Identitasmu disimpan di
                  browser agar tidak perlu mengisi ulang.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileUp className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">2. Pilih Tugas &amp; Unggah File</h3>
                <p className="text-sm text-slate-600">
                  Unggah beberapa screenshot hasil program, laporan PDF/Word/PPT, atau arsip
                  kode ZIP (maks. 10 MB per file).
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">3. Pantau Status &amp; Revisi</h3>
                <p className="text-sm text-slate-600">
                  Lihat status pemeriksaan (Submitted, Reviewed, atau Revision Required) dan
                  kirim revisi kapan saja jika diminta guru.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Preview Tugas Terbaru */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tugas Aktif Terbaru</h2>
              <p className="text-sm text-slate-500">
                Beberapa tugas yang sedang dibuka untuk siswa kelas 10 dan 11.
              </p>
            </div>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Semua Tugas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-500">
                Belum ada tugas yang dipublikasikan saat ini.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {recentTasks.map((task) => (
                <Card
                  key={task.id}
                  className="flex flex-col justify-between transition-shadow hover:shadow-sm"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <ClassTargetBadge target={task.class_target} />
                      {task.deadline && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(task.deadline)}
                        </span>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
                      {task.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {task.description}
                    </p>
                  </CardContent>
                  <div className="border-t border-slate-100 px-5 py-3">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Lihat Detail Tugas
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
