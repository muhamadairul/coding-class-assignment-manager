<?php

namespace App\Modules\Submissions\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubmissionFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'submission_id' => $this->submission_id,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'is_image' => $this->isImage(),
            'admin_download_url' => url("/api/v1/admin/submissions/{$this->submission_id}/files/{$this->id}/download"),
            'public_download_url' => url("/api/v1/public/submissions/{$this->submission_id}/files/{$this->id}/download"),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
