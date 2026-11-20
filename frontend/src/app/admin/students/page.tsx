'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { adminApi, extractApiError } from '@/lib/api';
import type { PaginatedResponse, PaginationMeta, Student } from '@/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [meta, setMeta] = React.useState<PaginationMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterClass, setFilterClass] = React.useState('all');
  const [page, setPage] = React.useState(1);

  const loadStudents = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<PaginatedResponse<Student>>('/admin/students', {
        params: {
          search: search.trim() || undefined,
          class: filterClass !== 'all' ? filterClass : undefined,
          page,
          per_page: 15,
        },
      });
      setStudents(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memuat data siswa.'));
    } finally {
      setLoading(false);
    }
  }, [search, filterClass, page]);

  React.useEffect(() => {
    const t = setTimeout(() => loadStudents(), 200);
    return () => clearTimeout(t);
  }, [loadStudents]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Master Data Siswa
          </h2>
          <p className="text-sm text-slate-500">
            Data siswa tercatat otomatis saat pertama kali mengumpulkan tugas atau identifikasi NIS.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama siswa atau NIS..."
                className="h-9 pl-9"
              />
            </div>
            <Select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
              className="h-9 sm:w-44"
            >
              <option value="all">Semua Kelas</option>
              <option value="10">Kelas 10</option>
              <option value="11">Kelas 11</option>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3">Nama Siswa</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3 text-center">Total Tugas</th>
                    <th className="px-4 py-3 text-center">Sudah</th>
                    <th className="px-4 py-3 text-center">Belum</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-500">
                        Memuat data siswa...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-500">
                        Belum ada data siswa yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {student.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {student.nis}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="slate">Kelas {student.class}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-700">
                          {student.total_assignments ?? 0}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-emerald-700">
                          {student.submitted_assignments ?? 0}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-amber-700">
                          {student.not_submitted_assignments ?? 0}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link href={`/admin/students/${student.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3.5 w-3.5" />
                              Detail
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
                <span>
                  Halaman {meta.current_page} dari {meta.last_page} (Total {meta.total} siswa)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
