import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email('Masukkan alamat email yang valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const assignmentFormSchema = z.object({
  category_id: z.string().optional(),
  title: z.string().min(3, 'Judul tugas minimal 3 karakter').max(255),
  description: z.string().min(10, 'Deskripsi tugas minimal 10 karakter'),
  instructions: z.string().optional(),
  class_target: z.enum(['10', '11', 'all']),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

export const studentIdentifySchema = z.object({
  name: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(150),
  nis: z
    .string()
    .min(3, 'NIS minimal 3 karakter')
    .max(50)
    .regex(/^[A-Za-z0-9\-_.]+$/, 'NIS hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah'),
  class: z.enum(['10', '11'], {
    message: 'Pilih kelas 10 atau 11',
  }),
});

export type StudentIdentifyValues = z.infer<typeof studentIdentifySchema>;

export const submissionFormSchema = studentIdentifySchema.extend({
  assignment_id: z.string().min(1, 'Pilih tugas yang akan dikumpulkan'),
  notes: z.string().max(2000, 'Catatan maksimal 2000 karakter').optional(),
});

export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export const adminEditStudentSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(150),
  class: z.enum(['10', '11']),
});

export type AdminEditStudentValues = z.infer<typeof adminEditStudentSchema>;
