'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Pencil, Eye, History, KeyRound, ShieldOff, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton, Badge } from '@/components/ui/badge';
import {
  ReviewStatusBadge,
  StudentTaskStatusBadge,
} from '@/components/ui/status-badges';
import { adminApi, extractApiError } from '@/lib/api';
import { adminEditStudentSchema, type AdminEditStudentValues } from '@/lib/validators';
import { formatDateTime } from '@/lib/utils';
import type { Student, Submission, SubmissionHistory } from '@/types';

interface StudentDetailPayload {
  student: Student;
  tasks: {
    assignment: {
      id: number;
      title: string;
      class_target: string;
      deadline: string | null;
    };
    task_status: 'not_submitted' | 'submitted' | 'late';
    submission: Submission | null;
    histories: SubmissionHistory[];
  }[];
}

export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = React.useState<StudentDetailPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [recoveryToken, setRecoveryToken] = React.useState<string | null>(null);
  const [issuingToken, setIssuingToken] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminEditStudentValues>({
    resolver: zodResolver(adminEditStudentSchema),
  });

  const loadDetail = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<{ data: StudentDetailPayload }>(
        `/admin/students/${params.id}`
      );
      setData(res.data.data);
      reset({
        name: res.data.data.student.name,
        class: (res.data.data.student.class as '10' | '11') || '10',
      });
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memuat detail siswa.'));
    } finally {
      setLoading(false);
    }
  }, [params.id, reset]);

  React.useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSaveEdit = async (values: AdminEditStudentValues) => {
    setSaving(true);
    try {
      await adminApi.put(`/admin/students/${params.id}`, values);
      toast.success('Data siswa berhasil dikoreksi.');
      setEditOpen(false);
      await loadDetail();
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memperbarui data siswa.'));
    } finally {
      setSaving(false);
    }
  };

  const handleIssueRecovery = async () => {
    setIssuingToken(true);
    try {
      const res = await adminApi.post<{ data: { recovery_token: string } }>(
        `/admin/students/${params.id}/recovery-token`
      );
      setRecoveryToken(res.data.data.recovery_token);
      toast.success('Token pemulihan berhasil dibuat.');
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal membuat token pemulihan.'));
    } finally {
      setIssuingToken(false);
    }
  };

  const handleRevokeTokens = async () => {
    try {
      await adminApi.delete(`/admin/students/${params.id}/tokens`);
      toast.success('Seluruh token akses siswa telah dicabut.');
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal mencabut token.'));
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Data Siswa
          </Link>
          {data && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={issuingToken}
                onClick={handleIssueRecovery}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Token Pemulihan
              </Button>
              <Button size="sm" variant="outline" onClick={handleRevokeTokens}>
                <ShieldOff className="h-3.5 w-3.5" />
                Cabut Token
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Koreksi Nama / Kelas
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : !data ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Siswa tidak ditemukan.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Nama Lengkap</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {data.student.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">NIS</p>
                  <p className="mt-1 font-mono text-base font-semibold text-slate-900">
                    {data.student.nis}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kelas</p>
                  <div className="mt-1">
                    <Badge variant="indigo">Kelas {data.student.class}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Progres Tugas</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                    {data.student.submitted_assignments ?? 0} /{' '}
                    {data.student.total_assignments ?? 0} dikumpulkan
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daftar Tugas Relevan</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-3">Tugas</th>
                        <th className="px-4 py-3">Deadline</th>
                        <th className="px-4 py-3">Status Tugas</th>
                        <th className="px-4 py-3">Waktu Pengumpulan</th>
                        <th className="px-4 py-3">Revisi</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.tasks.map((row) => (
                        <tr key={row.assignment.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5 font-medium text-slate-900">
                            {row.assignment.title}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                            {formatDateTime(row.assignment.deadline)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              <StudentTaskStatusBadge status={row.task_status} />
                              {row.submission && (
                                <ReviewStatusBadge status={row.submission.status} />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                            {row.submission
                              ? formatDateTime(row.submission.submitted_at)
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            {row.histories.length > 1 ? (
                              <span className="inline-flex items-center gap-1 font-mono text-amber-700">
                                <History className="h-3.5 w-3.5" />
                                {row.histories.length - 1}x revisi
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {row.submission ? (
                              <Link href={`/admin/submissions/${row.submission.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3.5 w-3.5" />
                                  Detail
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">Belum ada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Koreksi Data Siswa"
        description="Perbaiki nama atau kelas siswa jika terjadi kesalahan saat penginputan awal."
      >
        <form onSubmit={handleSubmit(handleSaveEdit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nama Lengkap
            </label>
            <Input {...register('name')} />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Kelas
            </label>
            <Select {...register('class')}>
              <option value="10">Kelas 10</option>
              <option value="11">Kelas 11</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Koreksi'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(recoveryToken)}
        onClose={() => setRecoveryToken(null)}
        title="Token Pemulihan Akses Siswa"
        description="Berikan token ini secara pribadi kepada siswa untuk memulihkan akses di perangkat baru. Berlaku selama 7 hari."
      >
        {recoveryToken && (
          <div className="space-y-4">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 font-mono text-xs break-all text-indigo-950">
              {recoveryToken}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryToken);
                  toast.success('Token disalin ke clipboard.');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Salin Token
              </Button>
              <Button type="button" onClick={() => setRecoveryToken(null)}>
                Selesai
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
