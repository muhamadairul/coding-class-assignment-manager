<?php

namespace App\Modules\Submissions\Services;

use App\Models\Assignment;
use App\Models\Student;
use App\Models\Submission;
use App\Models\SubmissionFile;
use App\Models\SubmissionHistory;
use App\Modules\Files\Services\FileStorageService;
use App\Shared\Contracts\FileStorageInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmissionService
{
    public function __construct(
        private readonly FileStorageInterface $fileStorage
    ) {}

    /**
     * @param array<int, UploadedFile> $files
     */
    public function submit(Student $student, Assignment $assignment, array $files, ?string $notes = null): Submission
    {
        if (! $assignment->isPublished()) {
            throw ValidationException::withMessages([
                'assignment_id' => ['Tugas ini belum dipublikasikan atau sudah diarsipkan.'],
            ]);
        }

        if (! $assignment->isTargetedToClass($student->class)) {
            throw ValidationException::withMessages([
                'assignment_id' => ["Tugas ini hanya ditujukan untuk Kelas {$assignment->class_target}, bukan Kelas {$student->class}."],
            ]);
        }

        if (count($files) === 0) {
            throw ValidationException::withMessages([
                'files' => ['Minimal unggah 1 file tugas.'],
            ]);
        }

        if (count($files) > FileStorageService::MAX_FILES_PER_SUBMISSION) {
            throw ValidationException::withMessages([
                'files' => ['Maksimal '.FileStorageService::MAX_FILES_PER_SUBMISSION.' file per pengumpulan.'],
            ]);
        }

        $existing = Submission::where('student_id', $student->id)
            ->where('assignment_id', $assignment->id)
            ->first();

        if ($existing) {
            if ($existing->status === Submission::STATUS_REVISION_REQUIRED) {
                return $this->submitRevision($existing, $student, $files, $notes);
            }

            throw ValidationException::withMessages([
                'assignment_id' => ['Anda sudah mengumpulkan tugas ini. Pengumpulan ulang hanya diperbolehkan jika admin meminta revisi.'],
            ]);
        }

        $uploadedMeta = [];
        try {
            foreach ($files as $file) {
                $uploadedMeta[] = $this->fileStorage->storeSubmissionFile($file, $assignment->id, $student->id);
            }

            return DB::transaction(function () use ($student, $assignment, $uploadedMeta, $notes) {
                $submittedAt = now();

                $submission = Submission::create([
                    'student_id' => $student->id,
                    'assignment_id' => $assignment->id,
                    'submitted_at' => $submittedAt,
                    'status' => Submission::STATUS_SUBMITTED,
                    'notes' => $notes,
                ]);

                foreach ($uploadedMeta as $meta) {
                    SubmissionFile::create([
                        'submission_id' => $submission->id,
                        ...$meta,
                    ]);
                }

                SubmissionHistory::create([
                    'submission_id' => $submission->id,
                    'student_id' => $student->id,
                    'assignment_id' => $assignment->id,
                    'notes' => $notes,
                    'status' => Submission::STATUS_SUBMITTED,
                    'file_count' => count($uploadedMeta),
                    'submitted_at' => $submittedAt,
                ]);

                return $submission->load(['student', 'assignment.category', 'files', 'histories']);
            });
        } catch (\Throwable $e) {
            $this->fileStorage->deleteFiles(array_map(
                fn ($m) => ['path' => $m['file_path'], 'disk' => $m['disk']],
                $uploadedMeta
            ));
            throw $e;
        }
    }

    /**
     * @param array<int, UploadedFile> $files
     */
    public function submitRevision(Submission $submission, Student $student, array $files, ?string $notes = null): Submission
    {
        if ($submission->student_id !== $student->id) {
            abort(403, 'Anda tidak memiliki izin untuk merevisi pengumpulan milik siswa lain.');
        }

        if ($submission->status !== Submission::STATUS_REVISION_REQUIRED) {
            throw ValidationException::withMessages([
                'submission' => ['Revisi hanya dapat dikirimkan apabila status pemeriksaan adalah Revision Required.'],
            ]);
        }

        if (count($files) === 0) {
            throw ValidationException::withMessages([
                'files' => ['Minimal unggah 1 file revisi.'],
            ]);
        }

        if (count($files) > FileStorageService::MAX_FILES_PER_SUBMISSION) {
            throw ValidationException::withMessages([
                'files' => ['Maksimal '.FileStorageService::MAX_FILES_PER_SUBMISSION.' file per pengumpulan.'],
            ]);
        }

        $uploadedMeta = [];
        $oldFiles = $submission->files()
            ->get(['file_path', 'disk'])
            ->map(fn ($f) => ['path' => $f->file_path, 'disk' => $f->disk ?: 'local'])
            ->all();

        try {
            foreach ($files as $file) {
                $uploadedMeta[] = $this->fileStorage->storeSubmissionFile($file, $submission->assignment_id, $student->id);
            }

            $updated = DB::transaction(function () use ($submission, $student, $uploadedMeta, $notes) {
                $submittedAt = now();

                if ($submission->histories()->count() === 0) {
                    SubmissionHistory::create([
                        'submission_id' => $submission->id,
                        'student_id' => $submission->student_id,
                        'assignment_id' => $submission->assignment_id,
                        'notes' => $submission->notes,
                        'admin_notes' => $submission->admin_notes,
                        'status' => $submission->status,
                        'file_count' => $submission->files()->count(),
                        'submitted_at' => $submission->submitted_at,
                    ]);
                }

                $submission->files()->delete();

                foreach ($uploadedMeta as $meta) {
                    SubmissionFile::create([
                        'submission_id' => $submission->id,
                        ...$meta,
                    ]);
                }

                $submission->update([
                    'submitted_at' => $submittedAt,
                    'status' => Submission::STATUS_SUBMITTED,
                    'notes' => $notes !== null ? $notes : $submission->notes,
                ]);

                SubmissionHistory::create([
                    'submission_id' => $submission->id,
                    'student_id' => $student->id,
                    'assignment_id' => $submission->assignment_id,
                    'notes' => $notes,
                    'admin_notes' => $submission->admin_notes,
                    'status' => Submission::STATUS_SUBMITTED,
                    'file_count' => count($uploadedMeta),
                    'submitted_at' => $submittedAt,
                ]);

                return $submission->fresh(['student', 'assignment.category', 'files', 'histories']);
            });

            $this->fileStorage->deleteFiles($oldFiles);

            return $updated;
        } catch (\Throwable $e) {
            $this->fileStorage->deleteFiles(array_map(
                fn ($m) => ['path' => $m['file_path'], 'disk' => $m['disk']],
                $uploadedMeta
            ));
            throw $e;
        }
    }

    public function markReviewed(Submission $submission, ?string $adminNotes = null): Submission
    {
        $submission->update([
            'status' => Submission::STATUS_REVIEWED,
            'admin_notes' => $adminNotes,
        ]);

        return $submission->fresh(['student', 'assignment.category', 'files', 'histories']);
    }

    public function requestRevision(Submission $submission, string $adminNotes): Submission
    {
        $submission->update([
            'status' => Submission::STATUS_REVISION_REQUIRED,
            'admin_notes' => $adminNotes,
        ]);

        return $submission->fresh(['student', 'assignment.category', 'files', 'histories']);
    }
}
