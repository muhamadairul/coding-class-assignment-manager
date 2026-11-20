'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/components/layout/admin-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  AssignmentStatusBadge,
  ClassTargetBadge,
} from '@/components/ui/status-badges';
import { adminApi, extractApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Assignment, AssignmentCategory, PaginatedResponse, PaginationMeta } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function AdminAssignmentsPage() {
  const [items, setItems] = React.useState<Assignment[]>([]);
  const [categories, setCategories] = React.useState<AssignmentCategory[]>([]);
  const [meta, setMeta] = React.useState<PaginationMeta | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState('');
  const [classTarget, setClassTarget] = React.useState('all_filter');
  const [categoryId, setCategoryId] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('created_at');
  const [page, setPage] = React.useState(1);

  const [deleteTarget, setDeleteTarget] = React.useState<Assignment | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    adminApi
      .get<{ data: AssignmentCategory[] }>('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => setCategories([]));
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<PaginatedResponse<Assignment>>('/admin/assignments', {
        params: {
          search: search.trim() || undefined,
          class_target: classTarget !== 'all_filter' ? classTarget : undefined,
          category_id: categoryId !== 'all' ? categoryId : undefined,
          status: status !== 'all' ? status : undefined,
          sort_by: sortBy,
          sort_dir: 'desc',
          page,
          per_page: 10,
        },
      });
      setItems(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal memuat daftar tugas.'));
    } finally {
      setLoading(false);
    }
  }, [search, classTarget, categoryId, status, sortBy, page]);

  React.useEffect(() => {
    const t = setTimeout(() => loadData(), 200);
    return () => clearTimeout(t);
  }, [loadData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/admin/assignments/${deleteTarget.id}`);
      toast.success('Tugas berhasil dihapus dengan aman.');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(extractApiError(err, 'Gagal menghapus tugas.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Manajemen Tugas
            </h2>
            <p className="text-sm text-slate-500">
              Buat, publikasikan, dan pantau progres pengumpulan seluruh tugas coding.
            </p>
          </div>
          <Link href="/admin/assignments/create">
            <Button>
              <Plus className="h-4 w-4" />
              Buat Tugas Baru
            </Button>
          </Link>
        </div>

        {/* Filters */}
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
                placeholder="Cari judul tugas..."
                className="h-9 pl-9"
              />
            </div>

            <Select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="h-9"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              value={classTarget}
              onChange={(e) => {
                setClassTarget(e.target.value);
                setPage(1);
              }}
              className="h-9"
            >
              <option value="all_filter">Semua Target Kelas</option>
              <option value="all">Semua Kelas (10 &amp; 11)</option>
              <option value="10">Kelas 10</option>
              <option value="11">Kelas 11</option>
            </Select>

            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9"
            >
              <option value="all">Semua Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9"
            >
              <option value="created_at">Urutkan: Terbaru</option>
              <option value="deadline">Urutkan: Deadline</option>
              <option value="title">Urutkan: Judul</option>
              <option value="submissions_count">Urutkan: Jumlah Pengumpulan</option>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3">Judul Tugas</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3 text-center">Sudah</th>
                    <th className="px-4 py-3 text-center">Belum</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-500">
                        Memuat daftar tugas...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-500">
                        Belum ada tugas yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/assignments/${item.id}`}
                              className="font-semibold text-slate-900 hover:text-indigo-600"
                            >
                              {item.title}
                            </Link>
                            {item.category && (
                              <Badge variant="indigo">{item.category.name}</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                            Mulai: {formatDateTime(item.start_date)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <ClassTargetBadge target={item.class_target} />
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {formatDateTime(item.deadline)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-emerald-700">
                          {item.submitted_count ?? 0}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-amber-700">
                          {item.not_submitted_count ?? 0}
                        </td>
                        <td className="px-4 py-3.5">
                          <AssignmentStatusBadge status={item.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Link href={`/admin/assignments/${item.id}`}>
                              <Button size="icon" variant="ghost" title="Detail">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/admin/assignments/${item.id}/edit`}>
                              <Button size="icon" variant="ghost" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Hapus"
                              onClick={() => setDeleteTarget(item)}
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                  Halaman {meta.current_page} dari {meta.last_page} (Total {meta.total} tugas)
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

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Tugas?"
        description="Penghapusan dilakukan secara aman (soft delete) sehingga riwayat pengumpulan siswa tidak akan hilang."
      >
        <p className="text-sm text-slate-700">
          Apakah Anda yakin ingin menghapus tugas{' '}
          <strong>{deleteTarget?.title}</strong>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
          <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Menghapus...' : 'Ya, Hapus Tugas'}
          </Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
