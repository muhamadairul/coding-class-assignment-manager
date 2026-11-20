'use client';

import * as React from 'react';
import {
  UploadCloud,
  X,
  FileText,
  FileArchive,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import {
  cn,
  FILE_ACCEPT_ATTR,
  formatFileSize,
  MAX_FILES_COUNT,
  validateClientFile,
} from '@/lib/utils';

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  error?: string | null;
}

export function FileUploader({
  files,
  onChange,
  disabled = false,
  error,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const urls: Record<string, string> = {};
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        urls[`${file.name}-${file.size}-${file.lastModified}`] =
          URL.createObjectURL(file);
      }
    });
    setPreviews(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const addFiles = (incomingList: FileList | File[]) => {
    setLocalError(null);
    const incoming = Array.from(incomingList);
    if (incoming.length === 0) return;

    const errors: string[] = [];
    const next = [...files];

    for (const file of incoming) {
      if (next.length >= MAX_FILES_COUNT) {
        errors.push(`Maksimal ${MAX_FILES_COUNT} file per pengumpulan.`);
        break;
      }
      const validationError = validateClientFile(file);
      if (validationError) {
        errors.push(validationError);
        continue;
      }
      const duplicate = next.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified
      );
      if (!duplicate) {
        next.push(file);
      }
    }

    if (errors.length > 0) {
      setLocalError(errors[0]);
    }
    onChange(next);
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const displayError = error || localError;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragActive
            ? 'border-indigo-500 bg-indigo-50/60'
            : 'border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/30',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <UploadCloud className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-slate-800">
          Klik untuk memilih file atau seret &amp; lepas ke sini
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Mendukung gambar (JPG, PNG, WEBP), dokumen (PDF, DOC/X, XLS/X, PPT/X), dan ZIP. Maks. 10 MB/file, hingga {MAX_FILES_COUNT} file.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT_ATTR}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              addFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {displayError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>File terpilih ({files.length}/{MAX_FILES_COUNT})</span>
            <span className="font-mono">
              Total: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {files.map((file, index) => {
              const key = `${file.name}-${file.size}-${file.lastModified}`;
              const previewUrl = previews[key];
              const isZip = file.name.toLowerCase().endsWith('.zip');
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5"
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      {isZip ? (
                        <FileArchive className="h-5 w-5 text-amber-600" />
                      ) : file.type.startsWith('image/') ? (
                        <ImageIcon className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800" title={file.name}>
                      {file.name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeFile(index)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Hapus ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
