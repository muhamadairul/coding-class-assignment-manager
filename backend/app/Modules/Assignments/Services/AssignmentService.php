<?php

namespace App\Modules\Assignments\Services;

use App\Models\Assignment;
use App\Models\Student;
use App\Shared\Contracts\FileStorageInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AssignmentService
{
    public function __construct(
        private readonly FileStorageInterface $fileStorage
    ) {}

    public function create(array $data, ?UploadedFile $attachment = null, ?int $createdBy = null): Assignment
    {
        $storedAttachment = null;

        if ($attachment) {
            $storedAttachment = $this->fileStorage->storeAssignmentAttachment($attachment);
        }

        try {
            return DB::transaction(function () use ($data, $storedAttachment, $createdBy) {
                $assignment = Assignment::create([
                    'category_id' => ! empty($data['category_id']) ? (int) $data['category_id'] : null,
                    'created_by' => $createdBy,
                    'title' => trim($data['title']),
                    'slug' => $this->generateUniqueSlug($data['title']),
                    'description' => $data['description'],
                    'instructions' => $data['instructions'] ?? null,
                    'class_target' => $this->normalizeClassTarget($data['class_target'] ?? null),
                    'attachment' => $storedAttachment['file_path'] ?? null,
                    'attachment_original_name' => $storedAttachment['original_name'] ?? null,
                    'attachment_disk' => $storedAttachment['disk'] ?? $this->fileStorage->activeDisk(),
                    'start_date' => $data['start_date'] ?? null,
                    'deadline' => $data['deadline'] ?? null,
                    'status' => $data['status'] ?? Assignment::STATUS_DRAFT,
                ]);

                return $assignment->load('category');
            });
        } catch (\Throwable $e) {
            if ($storedAttachment) {
                $this->fileStorage->deleteFiles([[
                    'path' => $storedAttachment['file_path'],
                    'disk' => $storedAttachment['disk'],
                ]]);
            }
            throw $e;
        }
    }

    public function update(
        Assignment $assignment,
        array $data,
        ?UploadedFile $attachment = null,
        bool $removeAttachment = false
    ): Assignment {
        $oldAttachment = $assignment->attachment
            ? ['path' => $assignment->attachment, 'disk' => $assignment->attachment_disk ?: 'local']
            : null;
        $newAttachment = null;

        if ($attachment) {
            $newAttachment = $this->fileStorage->storeAssignmentAttachment($attachment);
        }

        try {
            $updated = DB::transaction(function () use ($assignment, $data, $newAttachment, $removeAttachment) {
                $payload = [
                    'category_id' => ! empty($data['category_id']) ? (int) $data['category_id'] : null,
                    'title' => trim($data['title']),
                    'description' => $data['description'],
                    'instructions' => $data['instructions'] ?? null,
                    'class_target' => $this->normalizeClassTarget($data['class_target'] ?? null),
                    'start_date' => $data['start_date'] ?? null,
                    'deadline' => $data['deadline'] ?? null,
                    'status' => $data['status'] ?? $assignment->status,
                ];

                if (trim($data['title']) !== $assignment->title) {
                    $payload['slug'] = $this->generateUniqueSlug($data['title'], $assignment->id);
                }

                if ($newAttachment) {
                    $payload['attachment'] = $newAttachment['file_path'];
                    $payload['attachment_original_name'] = $newAttachment['original_name'];
                    $payload['attachment_disk'] = $newAttachment['disk'];
                } elseif ($removeAttachment) {
                    $payload['attachment'] = null;
                    $payload['attachment_original_name'] = null;
                }

                $assignment->update($payload);

                return $assignment->fresh('category');
            });

            if (($newAttachment || $removeAttachment) && $oldAttachment) {
                $this->fileStorage->deleteFiles([$oldAttachment]);
            }

            return $updated;
        } catch (\Throwable $e) {
            if ($newAttachment) {
                $this->fileStorage->deleteFiles([[
                    'path' => $newAttachment['file_path'],
                    'disk' => $newAttachment['disk'],
                ]]);
            }
            throw $e;
        }
    }

    public function delete(Assignment $assignment): void
    {
        DB::transaction(function () use ($assignment) {
            if ($assignment->status !== Assignment::STATUS_ARCHIVED) {
                $assignment->update(['status' => Assignment::STATUS_ARCHIVED]);
            }
            $assignment->delete();
        });
    }

    public function getStudentsStatus(Assignment $assignment): array
    {
        $studentsQuery = Student::query()->orderBy('class')->orderBy('name');

        if ($assignment->class_target && $assignment->class_target !== Assignment::CLASS_ALL) {
            $studentsQuery->where('class', $assignment->class_target);
        }

        $targetStudents = $studentsQuery->get();

        $submissions = $assignment->submissions()
            ->with(['student', 'files', 'assignment'])
            ->get()
            ->keyBy('student_id');

        $submitted = collect();
        $notSubmitted = collect();
        $lateCount = 0;

        foreach ($targetStudents as $student) {
            $submission = $submissions->get($student->id);
            if ($submission) {
                $isLate = $submission->isLate();
                if ($isLate) {
                    $lateCount++;
                }
                $submitted->push([
                    'student' => $student,
                    'submission' => $submission,
                    'is_late' => $isLate,
                ]);
            } else {
                $notSubmitted->push($student);
            }
        }

        foreach ($submissions as $studentId => $submission) {
            if (! $targetStudents->contains('id', $studentId) && $submission->student) {
                $isLate = $submission->isLate();
                if ($isLate) {
                    $lateCount++;
                }
                $submitted->push([
                    'student' => $submission->student,
                    'submission' => $submission,
                    'is_late' => $isLate,
                ]);
            }
        }

        return [
            'total_target_students' => $targetStudents->count(),
            'submitted_count' => $submitted->count(),
            'not_submitted_count' => $notSubmitted->count(),
            'late_count' => $lateCount,
            'submitted_students' => $submitted->values(),
            'not_submitted_students' => $notSubmitted->values(),
        ];
    }

    private function generateUniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'tugas';
        $slug = $base;
        $counter = 1;

        while (
            Assignment::withTrashed()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function normalizeClassTarget(?string $classTarget): string
    {
        if (! $classTarget || $classTarget === '' || $classTarget === Assignment::CLASS_ALL) {
            return Assignment::CLASS_ALL;
        }

        return $classTarget;
    }
}
