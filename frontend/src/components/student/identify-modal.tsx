'use client';

import * as React from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, KeyRound, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { studentIdentifySchema, type StudentIdentifyValues } from '@/lib/validators';
import { bffApi, extractApiError } from '@/lib/api';
import { setStudentProfileHint } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { Student } from '@/types';

interface IdentifyStudentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

export function IdentifyStudentModal({
  open,
  onClose,
  onSuccess,
}: IdentifyStudentModalProps) {
  const [mode, setMode] = React.useState<'nis' | 'recovery'>('nis');
  const [recoveryToken, setRecoveryToken] = React.useState('');
  const [mismatchStudent, setMismatchStudent] = React.useState<{
    nis: string;
    name: string;
    class: string;
  } | null>(null);
  const [pendingValues, setPendingValues] = React.useState<StudentIdentifyValues | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StudentIdentifyValues>({
    resolver: zodResolver(studentIdentifySchema),
    defaultValues: {
      name: '',
      nis: '',
      class: '10',
    },
  });

  const submitIdentify = async (values: StudentIdentifyValues, confirmExisting = false) => {
    setSubmitting(true);
    try {
      const res = await bffApi.post<{
        message: string;
        data: { student: Student };
      }>('/student/identify', {
        ...values,
        confirm_existing: confirmExisting,
      });

      const student = res.data.data.student;
      setStudentProfileHint(student);
      toast.success(`Selamat datang, ${student.name}!`);
      setMismatchStudent(null);
      setPendingValues(null);
      reset();
      onSuccess(student);
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 409 &&
        err.response.data?.requires_confirmation
      ) {
        setMismatchStudent(err.response.data.existing_student);
        setPendingValues(values);
      } else {
        toast.error(extractApiError(err, 'Gagal memverifikasi NIS.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryToken.trim().length < 32) {
      toast.error('Masukkan token pemulihan yang diberikan oleh guru.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await bffApi.post<{
        message: string;
        data: { student: Student };
      }>('/student/recover', { token: recoveryToken.trim() });

      const student = res.data.data.student;
      setStudentProfileHint(student);
      toast.success(`Akses dipulihkan untuk ${student.name}!`);
      setRecoveryToken('');
      onSuccess(student);
    } catch (err) {
      toast.error(extractApiError(err, 'Token pemulihan tidak valid.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Identifikasi Siswa"
      description="Gunakan NIS untuk melihat status tugas atau gunakan token pemulihan dari guru jika berpindah perangkat."
    >
      <div className="mb-4 flex gap-1.5 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('nis')}
          className={cn(
            'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer',
            mode === 'nis' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
          )}
        >
          Identifikasi NIS
        </button>
        <button
          type="button"
          onClick={() => setMode('recovery')}
          className={cn(
            'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer',
            mode === 'recovery' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
          )}
        >
          Pulihkan Akses (Token Guru)
        </button>
      </div>

      {mode === 'recovery' ? (
        <form onSubmit={submitRecovery} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Token Pemulihan dari Guru
            </label>
            <Input
              value={recoveryToken}
              onChange={(e) => setRecoveryToken(e.target.value)}
              placeholder="Tempel token pemulihan 64 karakter..."
              className="font-mono text-xs"
            />
            <p className="mt-1 text-xs text-slate-500">
              Minta token pemulihan ke guru/admin apabila kamu berpindah perangkat.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              <KeyRound className="h-4 w-4" />
              {submitting ? 'Memulihkan...' : 'Pulihkan Akses'}
            </Button>
          </div>
        </form>
      ) : mismatchStudent && pendingValues ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              NIS sudah terdaftar dengan data berbeda
            </div>
            <p className="text-xs text-amber-800">
              Data siswa yang sudah tersimpan untuk NIS{' '}
              <span className="font-mono font-semibold">{mismatchStudent.nis}</span> adalah:
            </p>
            <div className="mt-2 rounded-md border border-amber-200 bg-white p-3 text-xs text-slate-700">
              <p>
                <strong>Nama:</strong> {mismatchStudent.name}
              </p>
              <p>
                <strong>Kelas:</strong> Kelas {mismatchStudent.class}
              </p>
            </div>
            <p className="mt-2 text-xs text-amber-800">
              Sistem tidak menimpa data yang sudah ada secara otomatis. Gunakan data terdaftar di atas atau hubungi guru untuk koreksi?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMismatchStudent(null);
                setPendingValues(null);
              }}
            >
              Periksa Ulang
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => submitIdentify(pendingValues, true)}
            >
              {submitting ? 'Memverifikasi...' : 'Gunakan Data Terdaftar'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => submitIdentify(v, false))} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nama Lengkap
            </label>
            <Input placeholder="Contoh: Alya Putri Ramadhani" {...register('name')} />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                NIS
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
                Kelas
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              <UserCheck className="h-4 w-4" />
              {submitting ? 'Memverifikasi...' : 'Lanjutkan'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
