'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Paperclip,
  Download,
  Clock,
  Eye,
  CheckCircle2,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/badge';
import {
  AssignmentStatusBadge,
  ClassTargetBadge,
  ReviewStatusBadge,
  TimelinessBadge,
} from '@/components/ui/status-badges';
import { adminApi, extractApiError } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import type { Assignment, Student, Submission } from '@/types';

interface StudentsStatusPayload {
  total_target_students: number;
  submitted_count: number;
  not_submitted_count: number;
  late_count: number;
  submitted_students: {
    student: Student;
    submission: Submission;
    is_late: boolean;
  }[];
  not_submitted_students: Student[];
}

export default function AdminAssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [assignment, setAssignment] = React.useState<Assignment | null>(null);
  const [statusData, setStatusData] = React.useState<StudentsStatusPayload | null>(null);
  const [tab, setTab] = React.useState<'submitted' | 'not_submitted'>('submitted');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      adminApi.get<{ data: Assignment }>(`/admin/assignments/${params.id}`),
      adminApi.get<{ data: StudentsStatusPayload }>(
        `/admin/assignments/${params.id}/students-status`
      ),
    ])
      .then(([aRes, sRes]) => {
        setAssignment(aRes.data.data);
        setStatusData(sRes.data.data);
      })
      .catch((err) => toast.error(extractApiError(err, 'Gagal memuat detail tugas.')))
      .finally(() => setLoading(false));
  }, [params.id]);

  const progress =
    statusData && statusData.total_target_students > 0
      ? Math.round((statusData.submitted_count / statusData.total_target_students) * 100)
      : 0;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/assignments"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Manajemen Tugas
          </Link>
          {assignment && (
            <Link href={`/admin/assignments/${assignment.id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="h-3.5 w-3.5" />
                Edit Tugas
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : !assignment ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Tugas tidak ditemukan.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="space-y-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <ClassTargetBadge target={assignment.class_target} />
                  <AssignmentStatusBadge status={assignment.status} />
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Deadline: {formatDateTime(assignment.deadline)}
                  </span>
                </div>
                <CardTitle className="text-xl">{assignment.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {assignment.description}
                </p>

                {assignment.instructions && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Instruksi Pengerjaan
                    </h4>
                    <p className="whitespace-pre-line text-sm text-slate-700">
                      {assignment.instructions}
                    </p>
                  </div>
                )}

                {assignment.has_attachment && assignment.attachment_download_url && (
                  <a
                    href={assignment.attachment_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    <Paperclip className="h-4 w-4" />
                    {assignment.attachment_name}
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}

                {statusData && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700">
                        Progress Pengumpulan ({progress}%)
                      </span>
                      <span className="font-mono text-slate-600">
                        Sudah: {statusData.submitted_count} · Belum:{' '}
                        {statusData.not_submitted_count} · Terlambat:{' '}
                        {statusData.late_count}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Status Tabs */}
            {statusData && (
              <Card>
                <CardHeader className="border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('submitted')}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer',
                        tab === 'submitted'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Sudah Mengumpulkan ({statusData.submitted_count})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('not_submitted')}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer',
                        tab === 'not_submitted'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      <UserX className="h-4 w-4" />
                      Belum Mengumpulkan ({statusData.not_submitted_count})
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {tab === 'submitted' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                            <th className="px-5 py-3">Nama Siswa</th>
                            <th className="px-4 py-3">NIS</th>
                            <th className="px-4 py-3">Kelas</th>
                            <th className="px-4 py-3">Waktu</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {statusData.submitted_students.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-5 py-8 text-center text-xs text-slate-500"
                              >
                                Belum ada siswa yang mengumpulkan tugas ini.
                              </td>
                            </tr>
                          ) : (
                            statusData.submitted_students.map(({ student, submission, is_late }) => (
                              <tr key={submission.id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3 font-medium text-slate-900">
                                  {student.name}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                  {student.nis}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600">
                                  Kelas {student.class}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                  {formatDateTime(submission.submitted_at)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    <TimelinessBadge isLate={is_late} />
                                    <ReviewStatusBadge status={submission.status} />
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <Link href={`/admin/submissions/${submission.id}`}>
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-3.5 w-3.5" />
                                      Periksa
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                            <th className="px-5 py-3">Nama Siswa</th>
                            <th className="px-4 py-3">NIS</th>
                            <th className="px-4 py-3">Kelas</th>
                            <th className="px-5 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {statusData.not_submitted_students.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-5 py-8 text-center text-xs text-emerald-700"
                              >
                                Semua siswa target sudah mengumpulkan tugas ini!
                              </td>
                            </tr>
                          ) : (
                            statusData.not_submitted_students.map((student) => (
                              <tr key={student.id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3 font-medium text-slate-900">
                                  {student.name}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                  {student.nis}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600">
                                  Kelas {student.class}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <Link href={`/admin/students/${student.id}`}>
                                    <Button size="sm" variant="ghost">
                                      Profil Siswa
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
