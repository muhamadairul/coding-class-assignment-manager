'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Code2,
  ClipboardList,
  Upload,
  History,
  UserCheck,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { bffApi, publicApi } from '@/lib/api';
import {
  clearStudentProfileHint,
  getStudentProfileHint,
  setStudentProfileHint,
} from '@/lib/storage';
import type { Student } from '@/types';
import { Button } from '@/components/ui/button';
import { IdentifyStudentModal } from '@/components/student/identify-modal';

interface StudentShellProps {
  children: React.ReactNode;
  onStudentChange?: (student: Student | null) => void;
}

const navItems = [
  { href: '/tasks', label: 'Daftar Tugas', icon: ClipboardList },
  { href: '/submit', label: 'Kumpulkan Tugas', icon: Upload },
  { href: '/history', label: 'Riwayat', icon: History },
];

export function StudentShell({ children, onStudentChange }: StudentShellProps) {
  const pathname = usePathname();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [identifyOpen, setIdentifyOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const cached = getStudentProfileHint();
    if (cached) setStudent(cached);

    publicApi
      .get<{ data: Student }>('/public/me')
      .then((res) => {
        setStudent(res.data.data);
        setStudentProfileHint(res.data.data);
        onStudentChange?.(res.data.data);
      })
      .catch(() => {
        if (cached) {
          clearStudentProfileHint();
          setStudent(null);
          onStudentChange?.(null);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIdentified = (nextStudent: Student) => {
    setStudent(nextStudent);
    setStudentProfileHint(nextStudent);
    setIdentifyOpen(false);
    onStudentChange?.(nextStudent);
  };

  const handleSwitchStudent = async () => {
    try {
      await bffApi.post('/student/logout');
    } catch {
      // Ignore error
    }
    clearStudentProfileHint();
    setStudent(null);
    onStudentChange?.(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Code2 className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-slate-900">
                Coding Class
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Assignment Manager
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
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

          <div className="hidden items-center gap-2.5 md:flex">
            {student ? (
              <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 py-1 pl-3 pr-1.5">
                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                <div className="text-xs leading-tight">
                  <span className="font-semibold text-slate-900">{student.name}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-indigo-700">
                    {student.nis} · Kls {student.class}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchStudent}
                  title="Ganti siswa"
                  className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-rose-600 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIdentifyOpen(true)}>
                <UserCheck className="h-3.5 w-3.5" />
                Masuk dengan NIS
              </Button>
            )}
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <Shield className="h-3.5 w-3.5" />
              Guru
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {student ? (
                <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="font-mono text-indigo-700">
                      NIS {student.nis} · Kelas {student.class}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleSwitchStudent}>
                    Ganti
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIdentifyOpen(true);
                  }}
                >
                  <UserCheck className="h-4 w-4" />
                  Identifikasi NIS
                </Button>
              )}
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                <Shield className="h-3.5 w-3.5" />
                Portal Guru / Admin
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <p>Coding Class Assignment Manager — Ekstrakurikuler Coding Kelas 10 &amp; 11</p>
          <Link href="/admin/login" className="font-medium text-indigo-600 hover:underline">
            Masuk sebagai Guru / Admin
          </Link>
        </div>
      </footer>

      <IdentifyStudentModal
        open={identifyOpen}
        onClose={() => setIdentifyOpen(false)}
        onSuccess={handleIdentified}
      />
    </div>
  );
}
