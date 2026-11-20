<?php

namespace App\Modules\Students\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'nis' => $this->nis,
            'class' => $this->class,
            'total_assignments' => $this->when(isset($this->total_assignments), (int) ($this->total_assignments ?? 0)),
            'submitted_assignments' => $this->when(isset($this->submitted_assignments), (int) ($this->submitted_assignments ?? 0)),
            'not_submitted_assignments' => $this->when(isset($this->not_submitted_assignments), (int) ($this->not_submitted_assignments ?? 0)),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
