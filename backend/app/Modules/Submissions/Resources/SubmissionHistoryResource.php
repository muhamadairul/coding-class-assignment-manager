<?php

namespace App\Modules\Submissions\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubmissionHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'submission_id' => $this->submission_id,
            'notes' => $this->notes,
            'admin_notes' => $this->admin_notes,
            'status' => $this->status,
            'file_count' => $this->file_count,
            'is_late' => $this->isLate(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
