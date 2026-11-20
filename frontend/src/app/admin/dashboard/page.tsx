'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Users,
  FileCheck2,
  UserX,
  AlertTriangle,
  Activity,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { AdminShell } from '@/components/layout/admin-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/badge';
import { ReviewStatusBadge, TimelinessBadge } from '@/components/ui/status-badges';
import { adminApi, extractApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type {
  Assignment,
  DashboardOverview,
  PaginatedResponse,
  Submission,
} from '@/types';

export default function AdminDashboardPage() {
  const [overview, setOverview] = React.useState<DashboardOverview | null>(null);
  const [recent, setRecent] = React.useState<Submission[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingRecent, setLoadingRecent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Recent submissions filters
  const [filterClass, setFilterClass] = React.useState('all');
  const [filterAssignment, setFilterAssignment] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      adminApi.get<{ data: DashboardOverview }>('/admin/dashboard'),
      adminApi.get<PaginatedResponse<Assignment>>('/admin/assignments', {
        params: { per_page: 100 },
      }),
    ])
      .then(([dashRes, assignRes]) => {
        setOverview(dashRes.data.data);
        setAssignments(assignRes.data.data);
      })
      .catch((err) => setError(extractApiError(err, 'Gagal memuat dashboard.')))
      .finally(() => setLoading(false));
  }, []);

  const fetchRecent = React.useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await adminApi.get<PaginatedResponse<Submission>>(
        '/admin/dashboard/recent-submissions',
        {
          params: {
            class: filterClass !== 'all' ? filterClass : undefined,
            assignment_id: filterAssignment !== 'all' ? filterAssignment : undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            per_page: 10,
          },
        }
      );
      setRecent(res.data.data);
    } catch {
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  }, [filterClass, filterAssignment, filterStatus, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const statCards = overview
    ? [
        {
          label: 'Total Tugas',
          value: overview.stats.total_assignments,
          icon: ClipboardList,
          accent: 'bg-indigo-50 text-indigo-600',
        },
        {
          label: 'Tugas Aktif',
          value: overview.stats.active_assignments,
          icon: Activity,
          accent: 'bg-emerald-50 text-emerald-600',
        },
        {
          label: 'Total Siswa',
          value: overview.stats.total_students,
          icon: Users,
          accent: 'bg-blue-50 text-blue-600',
        },
        {
          label: 'Total Pengumpulan',
          value: overview.stats.total_submissions,
          icon: FileCheck2,
          accent: 'bg-indigo-50 text-indigo-600',
        },
        {
          label: 'Siswa Belum Mengumpulkan',
          value: overview.stats.students_not_submitted,
          icon: UserX,
          accent: 'bg-amber-50 text-amber-600',
        },
        {
          label: 'Pengumpulan Terlambat',
          value: overview.stats.late_submissions,
          icon: AlertTriangle,
          accent: 'bg-rose-50 text-rose-600',
        },
      ]
    : [];

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Monitoring
          </h2>
          <p className="text-sm text-slate-500">
            Ringkasan aktivitas pengumpulan tugas ekstrakurikuler coding secara real-time.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : error || !overview ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-6 text-sm text-rose-700">
              {error || 'Gagal memuat data.'}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 6 Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.label}>
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <p className="text-xs font-medium text-slate-500">{card.label}</p>
                        <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900">
                          {card.value}
                        </p>
                      </div>
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.accent}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tren Pengumpulan (14 Hari Terakhir)</CardTitle>
                  <CardDescription>
                    Jumlah pengumpulan tugas siswa per hari.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.submissions_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Pengumpulan"
                        stroke="#4f46e5"
                        fill="#e0e7ff"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistik Pengumpulan per Kelas</CardTitle>
                  <CardDescription>
                    Perbandingan tugas sudah dikumpulkan vs belum dikumpulkan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overview.class_stats.map((c) => ({
                        name: `Kelas ${c.class}`,
                        Sudah: c.submitted,
                        Belum: c.not_submitted,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Sudah" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Belum" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Assignment Completion Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Tingkat Pengumpulan per Tugas Aktif</CardTitle>
                <CardDescription>
                  Diurutkan dari tingkat pengumpulan tertinggi hingga terendah.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overview.assignment_rates.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada tugas aktif.</p>
                ) : (
                  <div className="space-y-3">
                    {overview.assignment_rates.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <Link
                            href={`/admin/assignments/${item.id}`}
                            className="font-medium text-slate-800 hover:text-indigo-600"
                          >
                            {item.title}
                          </Link>
                          <span className="font-mono text-slate-600">
                            {item.submitted_count}/{item.target_students} siswa (
                            {item.completion_rate}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all"
                            style={{ width: `${Math.min(100, item.completion_rate)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Submissions Table */}
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>Pengumpulan Terbaru</CardTitle>
                    <CardDescription>
                      Filter berdasarkan kelas, tugas, status pemeriksaan, dan rentang tanggal.
                    </CardDescription>
                  </div>
                  <Link href="/admin/submissions">
                    <Button size="sm" variant="outline">
                      Lihat Semua Pengumpulan
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                  <Select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="h-9"
                  >
                    <option value="all">Semua Kelas</option>
                    <option value="10">Kelas 10</option>
                    <option value="11">Kelas 11</option>
                  </Select>

                  <Select
                    value={filterAssignment}
                    onChange={(e) => setFilterAssignment(e.target.value)}
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
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-9"
                  >
                    <option value="all">Semua Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="revision_required">Revision Required</option>
                  </Select>

                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9"
                    aria-label="Dari tanggal"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9"
                    aria-label="Sampai tanggal"
                  />
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                        <th className="py-3 pr-4">Siswa</th>
                        <th className="py-3 pr-4">NIS</th>
                        <th className="py-3 pr-4">Kelas</th>
                        <th className="py-3 pr-4">Tugas</th>
                        <th className="py-3 pr-4">Waktu</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingRecent ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                            Memuat pengumpulan...
                          </td>
                        </tr>
                      ) : recent.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                            Belum ada data pengumpulan sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        recent.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/70">
                            <td className="py-3 pr-4 font-medium text-slate-900">
                              {sub.student?.name}
                            </td>
                            <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                              {sub.student?.nis}
                            </td>
                            <td className="py-3 pr-4 text-xs text-slate-600">
                              Kelas {sub.student?.class}
                            </td>
                            <td className="py-3 pr-4 text-slate-800">
                              {sub.assignment?.title}
                            </td>
                            <td className="py-3 pr-4 font-mono text-xs text-slate-500">
                              {formatDateTime(sub.submitted_at)}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-1">
                                <TimelinessBadge isLate={sub.is_late} />
                                <ReviewStatusBadge status={sub.status} />
                              </div>
                            </td>
                            <td className="py-3 text-right">
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
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}
