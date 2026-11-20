<?php

namespace App\Shared\Contracts;

use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

interface FileStorageInterface
{
    public function activeDisk(): string;

    public function validateUploadedFile(UploadedFile $file, string $field = 'files'): void;

    /**
     * @return array{original_name: string, file_path: string, disk: string, mime_type: string, file_size: int}
     */
    public function storeSubmissionFile(UploadedFile $file, int $assignmentId, int $studentId): array;

    /**
     * @return array{file_path: string, original_name: string, disk: string}
     */
    public function storeAssignmentAttachment(UploadedFile $file): array;

    /**
     * @param array<int, array{path: string, disk?: string}|string|null> $files
     */
    public function deleteFiles(array $files): void;

    public function exists(string $path, ?string $disk = null): bool;

    public function getContents(string $path, ?string $disk = null): string;

    public function streamDownload(string $path, string $originalName, ?string $disk = null, bool $inline = false, ?string $mimeType = null): StreamedResponse;
}
