'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, Trash2, Bold, List, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { assignmentFormSchema, type AssignmentFormValues } from '@/lib/validators';
import { adminApi } from '@/lib/api';
import { FILE_ACCEPT_ATTR, toDateTimeLocalInput } from '@/lib/utils';
import type { Assignment, AssignmentCategory } from '@/types';

interface AssignmentFormProps {
  initialData?: Assignment | null;
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel?: string;
}

export function AssignmentForm({
  initialData,
  onSubmit,
  submitLabel = 'Simpan Tugas',
}: AssignmentFormProps) {
  const [categories, setCategories] = React.useState<AssignmentCategory[]>([]);
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const instructionsRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    adminApi
      .get<{ data: AssignmentCategory[] }>('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => setCategories([]));
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      category_id: initialData?.category_id ? String(initialData.category_id) : '',
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      instructions: initialData?.instructions ?? '',
      class_target: (initialData?.class_target as '10' | '11' | 'all') ?? 'all',
      start_date: toDateTimeLocalInput(initialData?.start_date),
      deadline: toDateTimeLocalInput(initialData?.deadline),
      status: (initialData?.status as 'draft' | 'published' | 'archived') ?? 'published',
    },
  });

  const insertFormat = (prefix: string, suffix = '') => {
    const current = getValues('instructions') || '';
    setValue('instructions', `${current}${current ? '\n' : ''}${prefix}${suffix}`);
    instructionsRef.current?.focus();
  };

  const handleFormSubmit = async (values: AssignmentFormValues) => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (values.category_id) fd.append('category_id', values.category_id);
      fd.append('title', values.title);
      fd.append('description', values.description);
      if (values.instructions) fd.append('instructions', values.instructions);
      fd.append('class_target', values.class_target);
      if (values.start_date) fd.append('start_date', values.start_date);
      if (values.deadline) fd.append('deadline', values.deadline);
      fd.append('status', values.status);
      if (attachmentFile) fd.append('attachment', attachmentFile);
      if (removeExistingAttachment) fd.append('remove_attachment', '1');

      await onSubmit(fd);
    } finally {
      setSaving(false);
    }
  };

  const { ref: regInstRef, ...regInstRest } = register('instructions');

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Judul Tugas <span className="text-rose-500">*</span>
        </label>
        <Input
          placeholder="Contoh: HTML & CSS - Membuat Halaman Profil"
          {...register('title')}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Deskripsi Tugas <span className="text-rose-500">*</span>
        </label>
        <Textarea
          rows={4}
          placeholder="Jelaskan tujuan dan ringkasan tugas..."
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            Instruksi Pengerjaan
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => insertFormat('**Teks Tebal**')}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              title="Sisipkan teks tebal"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('1. Langkah pengerjaan')}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              title="Sisipkan daftar langkah"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('`kode_contoh()`')}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              title="Sisipkan potongan kode"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <Textarea
          rows={5}
          placeholder="Tuliskan langkah-langkah pengerjaan, format file yang diharapkan, dll."
          {...regInstRest}
          ref={(el) => {
            regInstRef(el);
            instructionsRef.current = el;
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Kategori Materi
          </label>
          <Select {...register('category_id')}>
            <option value="">-- Tanpa Kategori --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Target Kelas
          </label>
          <Select {...register('class_target')}>
            <option value="all">Semua Kelas (10 &amp; 11)</option>
            <option value="10">Kelas 10</option>
            <option value="11">Kelas 11</option>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Status Tugas
          </label>
          <Select {...register('status')}>
            <option value="draft">Draft (Belum tampil di siswa)</option>
            <option value="published">Published (Aktif)</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Tanggal Mulai (Opsional)
          </label>
          <Input type="datetime-local" {...register('start_date')} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Deadline (Opsional)
          </label>
          <Input type="datetime-local" {...register('deadline')} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Lampiran Tugas (Opsional)
        </label>
        {initialData?.has_attachment && !removeExistingAttachment && !attachmentFile && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-slate-700">
              <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
              {initialData.attachment_name}
            </span>
            <button
              type="button"
              onClick={() => setRemoveExistingAttachment(true)}
              className="inline-flex items-center gap-1 text-rose-600 hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        )}
        <Input
          type="file"
          accept={FILE_ACCEPT_ATTR}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setAttachmentFile(file);
            if (file) setRemoveExistingAttachment(false);
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          Maksimal 10 MB. Mendukung PDF, dokumen Office, gambar, atau ZIP.
        </p>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
