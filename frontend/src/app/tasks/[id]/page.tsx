'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Paperclip,
  Upload,
  FileText,
  RotateCcw,
  History,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { StudentShell } from '@/components/layout/student-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/badge';
import { FileUploader } from '@/components/ui/file-uploader';
import {
  ClassTargetBadge,
  ReviewStatusBadge,
  StudentTaskStatusBadge,
  TimelinessBadge,
} from '@/components/ui/status-badges';
import { extractApiError, publicApi } from '@/lib/api';
import { formatDateTime, formatFileSize } from '@/lib/utils';
import type { Assignment, Student, SubmissionFile } from '@/types';

export default function StudentTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const [assignment, setAssignment] = React.useState<Assignment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Revision state
  const [revisionFiles, setRevisionFiles] = React.useState<File[]>([]);
  const [revisionNotes, setRevisionNotes] = React.useState('');
  const [submittingRevision, setSubmittingRevision] = React.useState(false);

  const loadAssignment = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await publicApi.get<{ data: Assignment }>(
        `/public/assignments/${params.id}`
      );
      setAssignment(res.data.data);
    } catch (err) {
      setError(extractApiError(err, 'Tugas tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const handleDownloadOwnFile = async (file: SubmissionFile) => {
    try {
      const res = await publicApi.get(
        `/public/submissions/${file.submission_id}/files/${file.id}/download`,
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

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment?.student_submission) return;
    if (revisionFiles.length === 0) {
      toast.error('Unggah minimal 1 file revisi.');
      return;
    }

    setSubmittingRevision(true);
    try {
      const fd = new FormData();
      if (revisionNotes.trim()) fd.append('notes', revisionNotes.trim());
      revisionFiles.forEach((f) => fd.append('files[]', f));

      await publicApi.post(
        `/public/submissions/${assignment.student_submission.id}/revision`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Revisi tugas berhasil dikirim!');
      setRevisionFiles([]);
      setRevisionNotes('');
      await loadAssignment();
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal mengirim revisi.'));
    } finally {
      setSubmittingRevision(false);
    }
  };

  const handleStudentChange = (_s: Student | null) => {
    loadAssignment();
  };

  return (
    <StudentShell onStudentChange={handleStudentChange}>
      <div className="space-y-6">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Tugas
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-52 w-full rounded-xl" />
          </div>
        ) : error || !assignment ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-8 text-center text-sm text-rose-700">
              {error || 'Tugas tidak ditemukan.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Assignment Info */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader className="space-y-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <ClassTargetBadge target={assignment.class_target} />
                    {assignment.category && (
                      <Badge variant="indigo">{assignment.category.name}</Badge>
                    )}
                    {assignment.student_task_status && (
                      <StudentTaskStatusBadge status={assignment.student_task_status} />
                    )}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {assignment.title}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    {assignment.start_date && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Mulai: {formatDateTime(assignment.start_date)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Deadline:{' '}
                      <strong className="text-slate-800">
                        {formatDateTime(assignment.deadline)}
                      </strong>
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-5">
                  <div>
                    <h2 className="mb-2 text-sm font-semibold text-slate-900">
                      Deskripsi Tugas
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {assignment.description}
                    </p>
                  </div>

                  {assignment.instructions && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h2 className="mb-2 text-sm font-semibold text-slate-900">
                        Instruksi Pengerjaan
                      </h2>
                      <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {assignment.instructions}
                      </div>
                    </div>
                  )}

                  {assignment.has_attachment && assignment.attachment_download_url && (
                    <div>
                      <h2 className="mb-2 text-sm font-semibold text-slate-900">
                        Lampiran Tugas
                      </h2>
                      <a
                        href={assignment.attachment_download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        <Paperclip className="h-4 w-4" />
                        {assignment.attachment_name || 'Unduh Lampiran'}
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revision Form if Revision Required */}
              {assignment.student_submission?.status === 'revision_required' && (
                <Card className="border-amber-300 bg-amber-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900">
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                      Kirim Revisi Tugas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRevisionSubmit} className="space-y-4">
                      <FileUploader
                        files={revisionFiles}
                        onChange={setRevisionFiles}
                        disabled={submittingRevision}
                      />
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Catatan Revisi (Opsional)
                        </label>
                        <Textarea
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                          placeholder="Jelaskan perbaikan yang sudah kamu lakukan..."
                          rows={3}
                        />
                      </div>
                      <Button type="submit" disabled={submittingRevision}>
                        <Upload className="h-4 w-4" />
                        {submittingRevision ? 'Mengirim Revisi...' : 'Kirim Revisi'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar: Submission Status */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Status Pengumpulan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assignment.student_submission ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <TimelinessBadge isLate={assignment.student_submission.is_late} />
                        <ReviewStatusBadge status={assignment.student_submission.status} />
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          Dikumpulkan pada:{' '}
                          <strong className="text-slate-900">
                            {formatDateTime(assignment.student_submission.submitted_at)}
                          </strong>
                        </p>
                        {assignment.student_submission.notes && (
                          <p className="rounded-lg bg-slate-50 p-2.5 text-slate-700">
                            <span className="block text-[11px] font-medium text-slate-500">
                              Catatan Kamu:
                            </span>
                            {assignment.student_submission.notes}
                          </p>
                        )}
                      </div>

                      {assignment.student_submission.admin_notes && (
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-xs">
                          <div className="mb-1 flex items-center gap-1.5 font-semibold text-indigo-800">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Catatan Guru
                          </div>
                          <p className="text-indigo-950 whitespace-pre-line">
                            {assignment.student_submission.admin_notes}
                          </p>
                        </div>
                      )}

                      {assignment.student_submission.files &&
                        assignment.student_submission.files.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-700">
                              File Terkirim ({assignment.student_submission.files.length})
                            </p>
                            <ul className="space-y-1.5">
                              {assignment.student_submission.files.map((file) => (
                                <li
                                  key={file.id}
                                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                                    <span className="truncate font-medium text-slate-800">
                                      {file.original_name}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadOwnFile(file)}
                                    className="shrink-0 font-mono text-[11px] text-indigo-600 hover:underline cursor-pointer"
                                  >
                                    {formatFileSize(file.file_size)}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {assignment.student_submission.histories &&
                        assignment.student_submission.histories.length > 1 && (
                          <div className="border-t border-slate-100 pt-3">
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <History className="h-3.5 w-3.5" />
                              Riwayat Pengumpulan ({assignment.student_submission.histories.length})
                            </p>
                            <ul className="space-y-1.5 text-[11px] text-slate-600">
                              {assignment.student_submission.histories.map((h, idx) => (
                                <li
                                  key={h.id}
                                  className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1.5"
                                >
                                  <span>
                                    Percobaan #{assignment.student_submission!.histories!.length - idx}
                                    {h.is_late ? ' (Terlambat)' : ''}
                                  </span>
                                  <span className="font-mono">
                                    {formatDateTime(h.submitted_at)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Kamu belum mengumpulkan tugas ini. Klik tombol di bawah untuk
                        mengunggah hasil pekerjaanmu.
                      </p>
                      <Link href={`/submit?assignment=${assignment.id}`} className="block">
                        <Button className="w-full">
                          <Upload className="h-4 w-4" />
                          Kumpulkan Tugas
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
