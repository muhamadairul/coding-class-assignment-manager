<?php

namespace App\Modules\Assignments\Resources;

use App\Modules\Submissions\Resources\SubmissionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ] : null),
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'instructions' => $this->instructions,
            'class_target' => $this->class_target ?? 'all',
            'has_attachment' => (bool) $this->attachment,
            'attachment_name' => $this->attachment_original_name,
            'attachment_download_url' => $this->attachment
                ? url("/api/v1/public/assignments/{$this->id}/attachment")
                : null,
            'start_date' => $this->start_date?->toIso8601String(),
            'deadline' => $this->deadline?->toIso8601String(),
            'is_overdue' => $this->deadline ? now()->greaterThan($this->deadline) : false,
            'status' => $this->status,
            'submitted_count' => $this->when(isset($this->submissions_count), (int) ($this->submissions_count ?? 0)),
            'not_submitted_count' => $this->when(isset($this->not_submitted_count), (int) ($this->not_submitted_count ?? 0)),
            'target_students_count' => $this->when(isset($this->target_students_count), (int) ($this->target_students_count ?? 0)),
            'student_submission' => $this->when(isset($this->student_submission), function () {
                return $this->student_submission
                    ? (new SubmissionResource($this->student_submission))->resolve()
                    : null;
            }),
            'student_task_status' => $this->when(isset($this->student_task_status), $this->student_task_status),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
