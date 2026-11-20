'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AssignmentForm } from '@/components/admin/assignment-form';
import { adminApi, extractApiError } from '@/lib/api';

export default function AdminCreateAssignmentPage() {
  const router = useRouter();

  const handleCreate = async (formData: FormData) => {
    try {
      await adminApi.post('/admin/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Tugas baru berhasil dibuat.');
      router.push('/admin/assignments');
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal membuat tugas.'));
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href="/admin/assignments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Tugas
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Buat Tugas Baru</CardTitle>
            <CardDescription>
              Lengkapi detail tugas, instruksi pengerjaan, target kelas, dan deadline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssignmentForm onSubmit={handleCreate} submitLabel="Simpan Tugas" />
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
