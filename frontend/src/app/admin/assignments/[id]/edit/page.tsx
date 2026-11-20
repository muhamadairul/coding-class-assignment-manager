'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/badge';
import { AssignmentForm } from '@/components/admin/assignment-form';
import { adminApi, extractApiError } from '@/lib/api';
import type { Assignment } from '@/types';

export default function AdminEditAssignmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = React.useState<Assignment | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    adminApi
      .get<{ data: Assignment }>(`/admin/assignments/${params.id}`)
      .then((res) => setAssignment(res.data.data))
      .catch((err) => toast.error(extractApiError(err, 'Gagal memuat tugas.')))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleUpdate = async (formData: FormData) => {
    try {
      await adminApi.post(`/admin/assignments/${params.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Tugas berhasil diperbarui.');
      router.push(`/admin/assignments/${params.id}`);
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memperbarui tugas.'));
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href={`/admin/assignments/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Detail Tugas
        </Link>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : assignment ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Edit Tugas</CardTitle>
              <CardDescription>{assignment.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentForm
                initialData={assignment}
                onSubmit={handleUpdate}
                submitLabel="Simpan Perubahan"
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Tugas tidak ditemukan.
            </CardContent>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
