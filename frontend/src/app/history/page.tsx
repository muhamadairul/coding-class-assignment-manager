'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  History,
  UserCheck,
  FileText,
  ArrowRight,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { StudentShell } from '@/components/layout/student-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/badge';
import { ReviewStatusBadge, TimelinessBadge } from '@/components/ui/status-badges';
import { IdentifyStudentModal } from '@/components/student/identify-modal';
import { extractApiError, publicApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { PaginatedResponse, Student, Submission } from '@/types';

export default function StudentHistoryPage() {
  const [student, setStudent] = React.useState<Student | null>(null);
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [identifyOpen, setIdentifyOpen] = React.useState(false);

  React.useEffect(() => {
    if (!student) {
      setLoading(false);
      setSubmissions([]);
      return;
    }

    setLoading(true);
    setError(null);
    publicApi
      .get<PaginatedResponse<Submission>>('/public/me/submissions', {
        params: { per_page: 50 },
      })
      .then((res) => setSubmissions(res.data.data))
      .catch((err) => setError(extractApiError(err, 'Gagal memuat riwayat pengumpulan.')))
      .finally(() => setLoading(false));
  }, [student]);

  return (
    <StudentShell onStudentChange={(next) => setStudent(next)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Riwayat Pengumpulan Tugas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pantau seluruh tugas yang sudah kamu kirim beserta status pemeriksaan dari guru.
          </p>
        </div>

        {!student ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <UserCheck className="mb-3 h-10 w-10 text-indigo-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Identifikasi NIS Diperlukan
              </h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Masukkan Nama, NIS, dan Kelas kamu (atau token pemulihan dari guru) untuk
                melihat riwayat pengumpulan tugas secara aman.
              </p>
              <Button className="mt-4" onClick={() => setIdentifyOpen(true)}>
                <UserCheck className="h-4 w-4" />
                Identifikasi dengan NIS
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-6 text-center text-sm text-rose-700">
              {error}
            </CardContent>
          </Card>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <History className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                Belum ada riwayat pengumpulan tugas
              </p>
              <Link href="/tasks" className="mt-4">
                <Button size="sm">Lihat Daftar Tugas</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <TimelinessBadge isLate={sub.is_late} />
                        <ReviewStatusBadge status={sub.status} />
                      </div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {sub.assignment?.title}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Dikumpulkan:{' '}
                        <span className="font-mono font-medium text-slate-700">
                          {formatDateTime(sub.submitted_at)}
                        </span>
                        {sub.files && (
                          <span className="ml-3 inline-flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {sub.files.length} file
                          </span>
                        )}
                      </p>

                      {sub.admin_notes && (
                        <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-950">
                          <span className="mb-0.5 flex items-center gap-1 font-semibold text-indigo-700">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Catatan Guru:
                          </span>
                          {sub.admin_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/tasks/${sub.assignment_id}`}>
                        <Button
                          size="sm"
                          variant={
                            sub.status === 'revision_required' ? 'warning' : 'outline'
                          }
                        >
                          {sub.status === 'revision_required' ? (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" />
                              Kirim Revisi
                            </>
                          ) : (
                            <>
                              Detail
                              <ArrowRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <IdentifyStudentModal
        open={identifyOpen}
        onClose={() => setIdentifyOpen(false)}
        onSuccess={(next) => {
          setStudent(next);
          setIdentifyOpen(false);
        }}
      />
    </StudentShell>
  );
}
