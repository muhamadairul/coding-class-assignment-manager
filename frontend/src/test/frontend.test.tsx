import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import {
  adminLoginSchema,
  studentIdentifySchema,
  submissionFormSchema,
} from '@/lib/validators';
import { validateClientFile, formatFileSize } from '@/lib/utils';
import { FileUploader } from '@/components/ui/file-uploader';
import {
  ReviewStatusBadge,
  StudentTaskStatusBadge,
  TimelinessBadge,
} from '@/components/ui/status-badges';

describe('Form Validation Schemas', () => {
  it('validates student identification fields properly', () => {
    const valid = studentIdentifySchema.safeParse({
      name: 'Alya Putri',
      nis: '1026001',
      class: '10',
    });
    expect(valid.success).toBe(true);

    const invalidNis = studentIdentifySchema.safeParse({
      name: 'Alya Putri',
      nis: '10 26!@#',
      class: '10',
    });
    expect(invalidNis.success).toBe(false);

    const invalidClass = studentIdentifySchema.safeParse({
      name: 'Alya Putri',
      nis: '1026001',
      class: '12',
    });
    expect(invalidClass.success).toBe(false);
  });

  it('validates submission form requires assignment selection', () => {
    const missingAssignment = submissionFormSchema.safeParse({
      name: 'Bima Sakti',
      nis: '1026002',
      class: '10',
      assignment_id: '',
      notes: '',
    });
    expect(missingAssignment.success).toBe(false);
  });

  it('validates admin login email and password', () => {
    expect(
      adminLoginSchema.safeParse({ email: 'not-an-email', password: '123' }).success
    ).toBe(false);
    expect(
      adminLoginSchema.safeParse({
        email: 'admin@codingclass.local',
        password: 'AdminCoding123!',
      }).success
    ).toBe(true);
  });
});

describe('File Validation & FileUploader Component', () => {
  it('accepts valid image, document, and zip files and rejects dangerous or oversized files', () => {
    const validImg = new File(['abc'], 'screenshot.png', { type: 'image/png' });
    const validPdf = new File(['abc'], 'laporan.pdf', { type: 'application/pdf' });
    const validZip = new File(['abc'], 'project.zip', { type: 'application/zip' });
    const dangerousPhp = new File(['<?php'], 'shell.php', { type: 'application/x-php' });

    expect(validateClientFile(validImg)).toBeNull();
    expect(validateClientFile(validPdf)).toBeNull();
    expect(validateClientFile(validZip)).toBeNull();
    expect(validateClientFile(dangerousPhp)).toContain('tidak diizinkan');

    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    expect(validateClientFile(oversized)).toContain('10 MB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('displays selected files and allows removing a file before submit', () => {
    const file1 = new File(['hello'], 'screen1.png', { type: 'image/png' });
    const file2 = new File(['world'], 'dokumen.pdf', { type: 'application/pdf' });
    const handleChange = vi.fn();

    const { getByText, getByLabelText } = render(
      <FileUploader files={[file1, file2]} onChange={handleChange} />
    );

    expect(getByText('screen1.png')).toBeInTheDocument();
    expect(getByText('dokumen.pdf')).toBeInTheDocument();

    getByLabelText('Hapus screen1.png').click();
    expect(handleChange).toHaveBeenCalledWith([file2]);
  });
});

describe('Status Badges Rendering', () => {
  it('renders task, timeliness, and review badges consistently', () => {
    const { getByText } = render(
      <div>
        <StudentTaskStatusBadge status="not_submitted" />
        <StudentTaskStatusBadge status="submitted" />
        <TimelinessBadge isLate={true} />
        <ReviewStatusBadge status="reviewed" />
        <ReviewStatusBadge status="revision_required" />
      </div>
    );

    expect(getByText('Belum Dikumpulkan')).toBeInTheDocument();
    expect(getByText('Sudah Dikumpulkan')).toBeInTheDocument();
    expect(getByText('Terlambat')).toBeInTheDocument();
    expect(getByText('Reviewed')).toBeInTheDocument();
    expect(getByText('Revision Required')).toBeInTheDocument();
  });
});
