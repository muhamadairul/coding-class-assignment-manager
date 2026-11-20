'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { ReviewStatusBadge, TimelinessBadge } from '@/components/ui/status-badges';
import { adminApi, extractApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type {
  Assignment,
  PaginatedResponse,
  PaginationMeta,
  Submission,
} from '@/types';

export default function AdminSubmissionsPage() {
  const [items, setItems] = React.useState<Submission[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [meta, setMeta] = React.useState<PaginationMeta | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState('');
  const [filterClass, setFilterClass] = React.useState('all');
  const [filterAssignment, setFilterAssignment] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterTimeliness, setFilterTimeliness] = React.useState('all');
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    adminApi
      .get<PaginatedResponse<Assignment>>('/admin/assignments', {
        params: { per_page: 100 },
      })
      .then((res) => setAssignments(res.data.data))
      .catch(() => setAssignments([]));
  }, []);

  const loadSubmissions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<PaginatedResponse<Submission>>(
        '/admin/submissions',
        {
          params: {
            search: search.trim() || undefined,
            class: filterClass !== 'all' ? filterClass : undefined,
            assignment_id: filterAssignment !== 'all' ? filterAssignment : undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined,
            timeliness: filterTimeliness !== 'all' ? filterTimeliness : undefined,
            page,
            per_page: 15,
          },
        }
      );
      setItems(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memuat daftar pengumpulan.'));
    } finally {
      setLoading(false);
    }
  }, [search, filterClass, filterAssignment, filterStatus, filterTimeliness, page]);

  React.useEffect(() => {
    const t = setTimeout(() => loadSubmissions(), 200);
    return () => clearTimeout(t);
  }, [loadSubmissions]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Pengumpulan Tugas
          </h2>
          <p className="text-sm text-slate-500">
            Periksa file tugas siswa, berikan status Reviewed, atau minta revisi.
          </p>
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nama, NIS, atau tugas..."
                className="h-9 pl-9"
              />
            </div>

            <Select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
              className="h-9"
            >
              <option value="all">Semua Kelas</option>
              <option value="10">Kelas 10</option>
              <option value="11">Kelas 11</option>
            </Select>

            <Select
              value={filterAssignment}
              onChange={(e) => {
                setFilterAssignment(e.target.value);
                setPage(1);
              }}
              className="h-9"
            >
              <option value="all">Semua Tugas</option>
              {assignments.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.title}
                </option>
              ))}
            </Select>

            <Select
              value={filterTimeliness}
              onChange={(e) => {
                setFilterTimeliness(e.target.value);
                setPage(1);
              }}
              className="h-9"
            >
              <option value="all">Semua Ketepatan Waktu</option>
              <option value="on_time">Tepat Waktu</option>
              <option value="late">Terlambat</option>
            </Select>

            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="h-9"
            >
              <option value="all">Semua Status Pemeriksaan</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="revision_required">Revision Required</option>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3">Siswa</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Tugas</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Ketepatan</th>
                    <th className="px-4 py-3">Pemeriksaan</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-xs text-slate-500">
                        Memuat data pengumpulan...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-xs text-slate-500">
                        Belum ada pengumpulan tugas sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {sub.student?.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {sub.student?.nis}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          Kelas {sub.student?.class}
                        </td>
                        <td className="px-4 py-3.5 text-slate-800">
                          {sub.assignment?.title}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                          {formatDateTime(sub.submitted_at)}
                        </td>
                        <td className="px-4 py-3.5">
                          <TimelinessBadge isLate={sub.is_late} />
                        </td>
                        <td className="px-4 py-3.5">
                          <ReviewStatusBadge status={sub.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link href={`/admin/submissions/${sub.id}`}>
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
                  Halaman {meta.current_page} dari {meta.last_page} (Total {meta.total} pengumpulan)
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
