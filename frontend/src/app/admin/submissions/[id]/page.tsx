'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileText,
  FileArchive,
  CheckCircle2,
  RotateCcw,
  History,
  User,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/badge';
import { ReviewStatusBadge, TimelinessBadge } from '@/components/ui/status-badges';
import { adminApi, extractApiError } from '@/lib/api';
import { formatDateTime, formatFileSize } from '@/lib/utils';
import type { Submission, SubmissionFile } from '@/types';

function AuthenticatedImagePreview({ file }: { file: SubmissionFile }) {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    adminApi
      .get(`/admin/submissions/${file.submission_id}/files/${file.id}/download`, {
        params: { inline: 1 },
        responseType: 'blob',
      })
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, file.submission_id]);

  if (!src) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
        Memuat preview...
      </div>
    );
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={file.original_name}
        className="h-44 w-full object-cover transition-transform hover:scale-105"
      />
    </a>
  );
}

export default function AdminSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const [submission, setSubmission] = React.useState<Submission | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adminNotes, setAdminNotes] = React.useState('');
  const [updating, setUpdating] = React.useState(false);

  const loadSubmission = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<{ data: Submission }>(
        `/admin/submissions/${params.id}`
      );
      setSubmission(res.data.data);
      setAdminNotes(res.data.data.admin_notes || '');
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memuat detail pengumpulan.'));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const handleDownloadAll = async () => {
    if (!submission) return;
    try {
      const res = await adminApi.get(`/admin/submissions/${submission.id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      const singleFile = submission.files?.length === 1 ? submission.files[0].original_name : null;
      a.download = singleFile || `submission-${submission.id}-files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal mengunduh file.'));
    }
  };

  const handleDownloadSingle = async (file: SubmissionFile) => {
    try {
      const res = await adminApi.get(
        `/admin/submissions/${file.submission_id}/files/${file.id}/download`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal mengunduh file.'));
    }
  };

  const handleReview = async () => {
    if (!submission) return;
    setUpdating(true);
    try {
      const res = await adminApi.put<{ data: Submission }>(
        `/admin/submissions/${submission.id}/review`,
        { admin_notes: adminNotes.trim() || null }
      );
      setSubmission(res.data.data);
      toast.success('Pengumpulan ditandai sebagai Reviewed.');
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memperbarui status.'));
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!submission) return;
    if (adminNotes.trim().length < 3) {
      toast.error('Masukkan catatan revisi untuk siswa minimal 3 karakter.');
      return;
    }
    setUpdating(true);
    try {
      const res = await adminApi.put<{ data: Submission }>(
        `/admin/submissions/${submission.id}/request-revision`,
        { admin_notes: adminNotes.trim() }
      );
      setSubmission(res.data.data);
      toast.success('Permintaan revisi dikirim ke siswa.');
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal meminta revisi.'));
    } finally {
      setUpdating(false);
    }
  };

  const imageFiles = submission?.files?.filter((f) => f.is_image) || [];
  const otherFiles = submission?.files?.filter((f) => !f.is_image) || [];

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Pengumpulan
          </Link>
          {submission && submission.files && submission.files.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleDownloadAll}>
              <Download className="h-3.5 w-3.5" />
              Unduh Semua File
            </Button>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : !submission ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Data pengumpulan tidak ditemukan.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left 2 Columns: Info, Files, Histories */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader className="border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <TimelinessBadge isLate={submission.is_late} />
                    <ReviewStatusBadge status={submission.status} />
                  </div>
                  <CardTitle className="pt-1 text-xl">
                    {submission.assignment?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 text-sm">
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                      <User className="h-3.5 w-3.5" />
                      Identitas Siswa
                    </p>
                    <p className="font-semibold text-slate-900">
                      {submission.student?.name}
                    </p>
                    <p className="font-mono text-xs text-slate-600">
                      NIS: {submission.student?.nis} · Kelas {submission.student?.class}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Waktu Pengumpulan
                    </p>
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {formatDateTime(submission.submitted_at)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Deadline: {formatDateTime(submission.assignment?.deadline)}
                    </p>
                  </div>
                  {submission.notes && (
                    <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3.5 text-xs text-slate-700">
                      <span className="mb-1 block font-semibold text-slate-500">
                        Catatan Siswa:
                      </span>
                      <p className="whitespace-pre-line">{submission.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Files & Image Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    File yang Dikumpulkan ({submission.files?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {imageFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Preview Gambar ({imageFiles.length})
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {imageFiles.map((file) => (
                          <div
                            key={file.id}
                            className="space-y-2 rounded-xl border border-slate-200 p-2.5"
                          >
                            <AuthenticatedImagePreview file={file} />
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate font-medium text-slate-700">
                                {file.original_name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadSingle(file)}
                                className="inline-flex shrink-0 items-center gap-1 text-indigo-600 hover:underline cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                {formatFileSize(file.file_size)}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {otherFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Dokumen &amp; Arsip ({otherFiles.length})
                      </p>
                      <ul className="space-y-2">
                        {otherFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              {file.original_name.toLowerCase().endsWith('.zip') ? (
                                <FileArchive className="h-4 w-4 shrink-0 text-amber-600" />
                              ) : (
                                <FileText className="h-4 w-4 shrink-0 text-indigo-600" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-800">
                                  {file.original_name}
                                </p>
                                <p className="font-mono text-[11px] text-slate-500">
                                  {formatFileSize(file.file_size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadSingle(file)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Unduh
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revision History */}
              {submission.histories && submission.histories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-4 w-4 text-indigo-600" />
                      Riwayat Pengumpulan &amp; Revisi ({submission.histories.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {submission.histories.map((h, idx) => (
                        <li
                          key={h.id}
                          className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">
                              Percobaan #{submission.histories!.length - idx}
                            </span>
                            <div className="flex items-center gap-2">
                              <TimelinessBadge isLate={h.is_late} />
                              <span className="font-mono text-slate-500">
                                {formatDateTime(h.submitted_at)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1 text-slate-600">
                            Jumlah file: <strong className="font-mono">{h.file_count}</strong>
                            {h.notes ? ` · Catatan: "${h.notes}"` : ''}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Review Action Panel */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Pemeriksaan Guru</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Catatan untuk Siswa
                    </label>
                    <Textarea
                      rows={4}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Berikan apresiasi atau detail perbaikan yang diminta..."
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Wajib diisi apabila memilih Minta Revisi.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="success"
                      disabled={updating}
                      onClick={handleReview}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Tandai sebagai Reviewed
                    </Button>
                    <Button
                      variant="warning"
                      disabled={updating}
                      onClick={handleRequestRevision}
                      className="w-full"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Minta Revisi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
