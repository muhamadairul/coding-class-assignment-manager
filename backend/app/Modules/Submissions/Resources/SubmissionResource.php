<?php

namespace App\Modules\Submissions\Resources;

use App\Modules\Students\Resources\StudentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isLate = $this->isLate();

        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'assignment_id' => $this->assignment_id,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'status' => $this->status,
            'is_late' => $isLate,
            'timeliness_status' => $isLate ? 'late' : 'on_time',
            'notes' => $this->notes,
            'admin_notes' => $this->admin_notes,
            'student' => $this->whenLoaded('student', fn () => (new StudentResource($this->student))->resolve()),
            'assignment' => $this->whenLoaded('assignment', function () {
                return [
                    'id' => $this->assignment->id,
                    'title' => $this->assignment->title,
                    'slug' => $this->assignment->slug,
                    'class_target' => $this->assignment->class_target ?? 'all',
                    'deadline' => $this->assignment->deadline?->toIso8601String(),
                    'status' => $this->assignment->status,
                ];
            }),
            'files' => $this->whenLoaded('files', fn () => SubmissionFileResource::collection($this->files)->resolve()),
            'files_count' => $this->whenLoaded('files', fn () => $this->files->count(), fn () => $this->files_count ?? null),
            'histories' => $this->whenLoaded('histories', fn () => SubmissionHistoryResource::collection($this->histories)->resolve()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
