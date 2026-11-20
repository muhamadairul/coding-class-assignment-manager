<?php

namespace App\Modules\Files\Services;

use App\Shared\Contracts\FileStorageInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileStorageService implements FileStorageInterface
{
    public const MAX_FILE_SIZE_KB = 10240; // 10 MB
    public const MAX_FILES_PER_SUBMISSION = 10;

    public const ALLOWED_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp',
        'pdf', 'doc', 'docx',
        'xls', 'xlsx',
        'ppt', 'pptx',
        'zip',
    ];

    public const BLOCKED_EXTENSIONS = [
        'php', 'phtml', 'phar', 'exe', 'bat', 'cmd', 'sh', 'bash',
        'ps1', 'vbs', 'js', 'mjs', 'cjs', 'html', 'htm', 'svg',
        'msi', 'dll', 'com', 'scr', 'jar', 'py', 'rb', 'pl',
    ];

    public function activeDisk(): string
    {
        return (string) config('filesystems.default', 'local');
    }

    public function validateUploadedFile(UploadedFile $file, string $field = 'files'): void
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, self::BLOCKED_EXTENSIONS, true) || ! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw ValidationException::withMessages([
                $field => ["Tipe file '.{$extension}' tidak diperbolehkan. Gunakan gambar (JPG, PNG, WEBP), dokumen (PDF, DOC/X, XLS/X, PPT/X), atau ZIP."],
            ]);
        }

        $originalName = strtolower($file->getClientOriginalName());
        $parts = explode('.', $originalName);
        if (count($parts) > 2) {
            foreach (array_slice($parts, 1, -1) as $middleExt) {
                if (in_array($middleExt, self::BLOCKED_EXTENSIONS, true)) {
                    throw ValidationException::withMessages([
                        $field => ['Nama file mengandung ekstensi berbahaya dan ditolak.'],
                    ]);
                }
            }
        }

        $maxBytes = self::MAX_FILE_SIZE_KB * 1024;
        if ($file->getSize() > $maxBytes) {
            throw ValidationException::withMessages([
                $field => ['Ukuran file maksimal adalah 10 MB per file.'],
            ]);
        }

        $mime = strtolower((string) $file->getMimeType());
        if ($mime !== '' && (str_contains($mime, 'php') || str_contains($mime, 'executable') || str_contains($mime, 'script') || str_contains($mime, 'html'))) {
            throw ValidationException::withMessages([
                $field => ['Konten file terdeteksi tidak aman dan ditolak.'],
            ]);
        }
    }

    public function storeSubmissionFile(UploadedFile $file, int $assignmentId, int $studentId): array
    {
        $this->validateUploadedFile($file);

        $disk = $this->activeDisk();
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = Str::uuid()->toString().'.'.$extension;
        $directory = "submissions/{$assignmentId}/{$studentId}";
        $path = $file->storeAs($directory, $filename, [
            'disk' => $disk,
            'visibility' => 'private',
        ]);

        return [
            'original_name' => Str::limit(basename($file->getClientOriginalName()), 240, ''),
            'file_path' => $path,
            'disk' => $disk,
            'mime_type' => $file->getMimeType() ?: $file->getClientMimeType() ?: 'application/octet-stream',
            'file_size' => (int) $file->getSize(),
        ];
    }

    public function storeAssignmentAttachment(UploadedFile $file): array
    {
        $this->validateUploadedFile($file, 'attachment');

        $disk = $this->activeDisk();
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = Str::uuid()->toString().'.'.$extension;
        $path = $file->storeAs('assignments/attachments', $filename, [
            'disk' => $disk,
            'visibility' => 'private',
        ]);

        return [
            'file_path' => $path,
            'original_name' => Str::limit(basename($file->getClientOriginalName()), 240, ''),
            'disk' => $disk,
        ];
    }

    public function deleteFiles(array $files): void
    {
        $grouped = [];
        foreach ($files as $item) {
            if (is_string($item) && $item !== '') {
                $grouped[$this->activeDisk()][] = $item;
            } elseif (is_array($item) && ! empty($item['path'])) {
                $disk = $item['disk'] ?? $this->activeDisk();
                $grouped[$disk][] = $item['path'];
            }
        }

        foreach ($grouped as $disk => $paths) {
            Storage::disk($disk)->delete($paths);
        }
    }

    public function exists(string $path, ?string $disk = null): bool
    {
        return Storage::disk($disk ?: $this->activeDisk())->exists($path);
    }

    public function getContents(string $path, ?string $disk = null): string
    {
        return Storage::disk($disk ?: $this->activeDisk())->get($path) ?? '';
    }

    public function streamDownload(
        string $path,
        string $originalName,
        ?string $disk = null,
        bool $inline = false,
        ?string $mimeType = null
    ): StreamedResponse {
        $resolvedDisk = $disk ?: $this->activeDisk();

        if ($inline) {
            return Storage::disk($resolvedDisk)->response($path, $originalName, [
                'Content-Type' => $mimeType ?: 'application/octet-stream',
                'Cache-Control' => 'private, max-age=3600',
            ]);
        }

        return Storage::disk($resolvedDisk)->download($path, $originalName);
    }
}
