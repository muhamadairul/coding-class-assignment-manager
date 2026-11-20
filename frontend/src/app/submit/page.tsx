'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  Upload,
  AlertTriangle,
  FileText,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { StudentShell } from '@/components/layout/student-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FileUploader } from '@/components/ui/file-uploader';
import { ReviewStatusBadge, TimelinessBadge } from '@/components/ui/status-badges';
import { submissionFormSchema, type SubmissionFormValues } from '@/lib/validators';
import { extractApiError, publicApi } from '@/lib/api';
import { getStudentProfileHint, setStudentProfileHint } from '@/lib/storage';
import { formatDateTime, formatFileSize } from '@/lib/utils';
import type { Assignment, PaginatedResponse, Student, Submission } from '@/types';

function SubmitFormContent() {
  const searchParams = useSearchParams();
  const initialAssignmentId = searchParams.get('assignment') || '';

  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = React.useState(true);
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);

  // Mismatch confirmation state
  const [mismatchStudent, setMismatchStudent] = React.useState<{
    nis: string;
    name: string;
    class: string;
  } | null>(null);
  const [pendingValues, setPendingValues] = React.useState<SubmissionFormValues | null>(null);

  // Success state
  const [successData, setSuccessData] = React.useState<{
    submission: Submission;
    student: Student;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: {
      name: '',
      nis: '',
      class: '10',
      assignment_id: initialAssignmentId,
      notes: '',
    },
  });

  const selectedClass = watch('class');

  React.useEffect(() => {
    const saved = getStudentProfileHint();
    if (saved) {
      setValue('name', saved.name);
      setValue('nis', saved.nis);
      if (saved.class === '10' || saved.class === '11') {
        setValue('class', saved.class);
      }
    }
  }, [setValue]);

  React.useEffect(() => {
    setLoadingAssignments(true);
    publicApi
      .get<PaginatedResponse<Assignment>>('/public/assignments', {
        params: { class: selectedClass, per_page: 50 },
      })
      .then((res) => {
        setAssignments(res.data.data);
      })
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, [selectedClass]);

  const performSubmit = async (values: SubmissionFormValues, confirmExisting = false) => {
    setFileError(null);
    if (files.length === 0) {
      setFileError('Minimal unggah 1 file tugas sebelum mengirim.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      fd.append('name', values.name.trim());
      fd.append('nis', values.nis.trim());
      fd.append('class', values.class);
      fd.append('assignment_id', values.assignment_id);
      if (values.notes?.trim()) fd.append('notes', values.notes.trim());
      if (confirmExisting) fd.append('confirm_existing', '1');
      files.forEach((file) => fd.append('files[]', file));

      const res = await publicApi.post<{
        message: string;
        data: {
          submission: Submission;
          student: Student;
        };
      }>('/public/submissions', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(
              Math.round((progressEvent.loaded * 100) / progressEvent.total)
            );
          }
        },
      });

      setStudentProfileHint(res.data.data.student);

      setMismatchStudent(null);
      setPendingValues(null);
      setSuccessData({
        submission: res.data.data.submission,
        student: res.data.data.student,
      });
      toast.success('Tugas berhasil dikumpulkan!');
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 409 &&
        err.response.data?.requires_confirmation
      ) {
        setMismatchStudent(err.response.data.existing_student);
        setPendingValues(values);
      } else {
        toast.error(extractApiError(err, 'Gagal mengumpulkan tugas.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    const { submission, student } = successData;
    return (
      <Card className="mx-auto max-w-2xl border-emerald-200">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Tugas Berhasil Dikumpulkan!
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Bukti pengumpulan tugas kamu telah tercatat di sistem.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Nama Siswa</span>
              <span className="font-semibold text-slate-900">
                {student.name} (Kelas {student.class})
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">NIS</span>
              <span className="font-mono font-semibold text-slate-900">
                {student.nis}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Tugas</span>
              <span className="text-right font-semibold text-slate-900">
                {submission.assignment?.title}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Waktu Pengumpulan</span>
              <span className="font-mono text-slate-900">
                {formatDateTime(submission.submitted_at)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Status</span>
              <div className="flex flex-wrap gap-1.5">
                <TimelinessBadge isLate={submission.is_late} />
                <ReviewStatusBadge status={submission.status} />
              </div>
            </div>
          </div>

          {submission.files && submission.files.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Daftar File Terkirim ({submission.files.length})
              </h2>
              <ul className="space-y-1.5">
                {submission.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      {file.original_name}
                    </span>
                    <span className="font-mono text-slate-500">
                      {formatFileSize(file.file_size)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/tasks">
              <Button variant="outline">
                <ClipboardList className="h-4 w-4" />
                Kembali ke Daftar Tugas
              </Button>
            </Link>
            <Link href="/history">
              <Button>
                Lihat Riwayat Pengumpulan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Form Pengumpulan Tugas</CardTitle>
          <CardDescription>
            Isi identitas siswa dan unggah file hasil pengerjaan tugas. Kamu dapat mengunggah
            beberapa gambar sekaligus bersama dokumen atau file ZIP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => performSubmit(v, false))}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <Input placeholder="Contoh: Alya Putri Ramadhani" {...register('name')} />
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  NIS <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="Contoh: 1026001"
                  className="font-mono"
                  {...register('nis')}
                />
                {errors.nis && (
                  <p className="mt-1 text-xs text-rose-600">{errors.nis.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Kelas <span className="text-rose-500">*</span>
                </label>
                <Select {...register('class')}>
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                </Select>
                {errors.class && (
                  <p className="mt-1 text-xs text-rose-600">{errors.class.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Pilih Tugas <span className="text-rose-500">*</span>
              </label>
              <Select disabled={loadingAssignments} {...register('assignment_id')}>
                <option value="">
                  {loadingAssignments
                    ? 'Memuat daftar tugas...'
                    : '-- Pilih Tugas untuk Kelas ' + selectedClass + ' --'}
                </option>
                {assignments.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.title}
                    {a.deadline ? ` (Deadline: ${formatDateTime(a.deadline)})` : ''}
                  </option>
                ))}
              </Select>
              {errors.assignment_id && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.assignment_id.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Upload File Tugas <span className="text-rose-500">*</span>
              </label>
              <FileUploader
                files={files}
                onChange={(next) => {
                  setFiles(next);
                  if (next.length > 0) setFileError(null);
                }}
                disabled={submitting}
                error={fileError}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Catatan Tambahan (Opsional)
              </label>
              <Textarea
                rows={3}
                placeholder="Tambahkan keterangan atau link repositori jika ada..."
                {...register('notes')}
              />
              {errors.notes && (
                <p className="mt-1 text-xs text-rose-600">{errors.notes.message}</p>
              )}
            </div>

            {submitting && uploadProgress > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Mengunggah file...</span>
                  <span className="font-mono font-semibold">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              <Upload className="h-4 w-4" />
              {submitting ? 'Mengirim Tugas...' : 'Kirim Tugas'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Modal
        open={Boolean(mismatchStudent)}
        onClose={() => setMismatchStudent(null)}
        title="Konfirmasi Data Siswa"
        description="NIS yang kamu masukkan sudah terdaftar dengan nama atau kelas berbeda."
      >
        {mismatchStudent && pendingValues && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Data Terdaftar di Sistem
              </div>
              <p>
                NIS: <strong className="font-mono">{mismatchStudent.nis}</strong>
              </p>
              <p>
                Nama: <strong>{mismatchStudent.name}</strong>
              </p>
              <p>
                Kelas: <strong>Kelas {mismatchStudent.class}</strong>
              </p>
              <p className="text-amber-800">
                Lanjutkan pengumpulan menggunakan data siswa terdaftar di atas? (Data lama tidak akan ditimpa).
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMismatchStudent(null)}
              >
                Batal &amp; Periksa Ulang
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => performSubmit(pendingValues, true)}
              >
                Lanjutkan &amp; Kirim Tugas
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function StudentSubmitPage() {
  return (
    <StudentShell>
      <React.Suspense
        fallback={
          <div className="mx-auto max-w-2xl h-96 animate-pulse rounded-xl bg-white border border-slate-200" />
        }
      >
        <SubmitFormContent />
      </React.Suspense>
    </StudentShell>
  );
}
