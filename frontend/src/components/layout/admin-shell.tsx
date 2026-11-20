'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Code2,
  LayoutDashboard,
  ClipboardList,
  Users,
  FileCheck2,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { adminApi, bffApi } from '@/lib/api';
import {
  clearAdminUserHint,
  getAdminUserHint,
  setAdminUserHint,
} from '@/lib/storage';
import type { AdminUser } from '@/types';

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/assignments', label: 'Manajemen Tugas', icon: ClipboardList },
  { href: '/admin/students', label: 'Data Siswa', icon: Users },
  { href: '/admin/submissions', label: 'Pengumpulan', icon: FileCheck2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<AdminUser | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const cached = getAdminUserHint();
    if (cached) setUser(cached);

    adminApi
      .get<{ data: AdminUser }>('/admin/me')
      .then((res) => {
        setUser(res.data.data);
        setAdminUserHint(res.data.data);
        setChecking(false);
      })
      .catch(() => {
        clearAdminUserHint();
        router.replace('/admin/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await bffApi.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    clearAdminUserHint();
    toast.success('Berhasil keluar dari akun admin.');
    router.replace('/admin/login');
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Memuat panel admin...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Code2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-bold text-slate-900">Coding Class</span>
            <span className="block text-[11px] font-medium text-indigo-600">
              Admin Panel
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {adminNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Lihat Portal Siswa
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="flex h-full w-64 flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Code2 className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-slate-900">Admin Panel</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {adminNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-800 sm:text-base">
              {adminNav.find((n) => pathname.startsWith(n.href))?.label || 'Admin'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
              <p className="text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
