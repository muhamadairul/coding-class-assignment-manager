'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Clock,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import { StudentShell } from '@/components/layout/student-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/badge';
import {
  ClassTargetBadge,
  ReviewStatusBadge,
  StudentTaskStatusBadge,
} from '@/components/ui/status-badges';
import { IdentifyStudentModal } from '@/components/student/identify-modal';
import { extractApiError, publicApi } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import type {
  Assignment,
  AssignmentCategory,
  PaginatedResponse,
  Student,
} from '@/types';

type TabKey = 'all' | 'not_submitted' | 'submitted';

export default function StudentTasksPage() {
  const [student, setStudent] = React.useState<Student | null>(null);
  const [categories, setCategories] = React.useState<AssignmentCategory[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<string>('all');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [tab, setTab] = React.useState<TabKey>('all');
  const [search, setSearch] = React.useState('');
  const [tasks, setTasks] = React.useState<Assignment[]>([]);
  const [counts, setCounts] = React.useState({ all: 0, not_submitted: 0, submitted: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [identifyOpen, setIdentifyOpen] = React.useState(false);

  React.useEffect(() => {
    publicApi
      .get<{ data: AssignmentCategory[] }>('/public/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => setCategories([]));
  }, []);

  const fetchTasks = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (student) {
        const res = await publicApi.get<{
          data: Assignment[];
          meta: { counts: { all: number; not_submitted: number; submitted: number } };
        }>('/public/me/assignments', {
          params: {
            tab,
            category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
            search: search.trim() || undefined,
          },
        });
        setTasks(res.data.data);
        setCounts(res.data.meta.counts);
      } else {
        const res = await publicApi.get<PaginatedResponse<Assignment>>('/public/assignments', {
          params: {
            class: selectedClass !== 'all' ? selectedClass : undefined,
            category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
            search: search.trim() || undefined,
            per_page: 50,
          },
        });
        setTasks(res.data.data);
        setCounts({
          all: res.data.data.length,
          not_submitted: res.data.data.length,
          submitted: 0,
        });
      }
    } catch (err) {
      setError(extractApiError(err, 'Gagal memuat daftar tugas.'));
    } finally {
      setLoading(false);
    }
  }, [student, selectedClass, selectedCategory, tab, search]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  const tabItems: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'Semua Tugas', count: student ? counts.all : undefined },
    {
      key: 'not_submitted',
      label: 'Belum Dikumpulkan',
      count: student ? counts.not_submitted : undefined,
    },
    {
      key: 'submitted',
      label: 'Sudah Dikumpulkan',
      count: student ? counts.submitted : undefined,
    },
  ];

  return (
    <StudentShell onStudentChange={(next) => setStudent(next)}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daftar Tugas Coding
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {student
                ? `Menampilkan tugas untuk Kelas ${student.class} (${student.name} · NIS ${student.nis})`
                : 'Identifikasi NIS kamu untuk memantau tugas mana yang belum dan sudah dikumpulkan.'}
            </p>
          </div>
          {!student && (
            <Button variant="outline" onClick={() => setIdentifyOpen(true)}>
              <UserCheck className="h-4 w-4" />
              Identifikasi NIS
            </Button>
          )}
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabItems.map((item) => {
              const disabledTab = !student && item.key !== 'all';
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={disabledTab}
                  onClick={() => setTab(item.key)}
                  title={
                    disabledTab
                      ? 'Identifikasi NIS terlebih dahulu untuk memfilter status pengumpulan'
                      : undefined
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                    tab === item.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    disabledTab && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {item.label}
                  {item.count !== undefined && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                        tab === item.key
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white text-slate-600'
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!student && (
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="h-9 sm:w-36"
              >
                <option value="all">Semua Kelas</option>
                <option value="10">Kelas 10</option>
                <option value="11">Kelas 11</option>
              </Select>
            )}
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 sm:w-40"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </Select>
            <div className="relative sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul tugas..."
                className="h-9 pl-9"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-6 text-center text-sm text-rose-700">
              {error}
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                Tidak ada tugas yang ditemukan
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Coba ubah kata kunci pencarian, kategori, atau pilih tab lainnya.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => {
              const isSubmitted =
                task.student_task_status === 'submitted' ||
                task.student_task_status === 'late';
              return (
                <Card
                  key={task.id}
                  className={cn(
                    'flex flex-col justify-between transition-all hover:shadow-sm',
                    isSubmitted && 'border-emerald-200 bg-emerald-50/20'
                  )}
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ClassTargetBadge target={task.class_target} />
                        {task.category && (
                          <Badge variant="indigo">{task.category.name}</Badge>
                        )}
                      </div>
                      {student && (
                        <StudentTaskStatusBadge status={task.student_task_status} />
                      )}
                    </div>

                    <div>
                      <h2 className="line-clamp-2 text-base font-semibold text-slate-900">
                        {task.title}
                      </h2>
                      <p className="mt-1.5 line-clamp-3 text-sm text-slate-600">
                        {task.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          Deadline:{' '}
                          <strong
                            className={cn(
                              task.is_overdue && !isSubmitted
                                ? 'text-rose-600'
                                : 'text-slate-700'
                            )}
                          >
                            {formatDateTime(task.deadline)}
                          </strong>
                        </span>
                      </div>
                      {task.student_submission && (
                        <div className="flex items-center gap-2 pt-1">
                          <ReviewStatusBadge status={task.student_submission.status} />
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                    <Link href={`/tasks/${task.id}`} className="w-full">
                      <Button
                        size="sm"
                        variant={isSubmitted ? 'outline' : 'default'}
                        className="w-full"
                      >
                        {isSubmitted ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Lihat Detail Pengumpulan
                          </>
                        ) : (
                          <>
                            Detail Tugas
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <IdentifyStudentModal
        open={identifyOpen}
        onClose={() => setIdentifyOpen(false)}
        onSuccess={(next) => {
          setStudent(next);
          setIdentifyOpen(false);
        }}
      />
    </StudentShell>
  );
}
