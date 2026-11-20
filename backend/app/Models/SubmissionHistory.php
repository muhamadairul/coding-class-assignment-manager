<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubmissionHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_id',
        'student_id',
        'assignment_id',
        'notes',
        'admin_notes',
        'status',
        'file_count',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'file_count' => 'integer',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class)->withTrashed();
    }

    public function isLate(): bool
    {
        $assignment = $this->relationLoaded('assignment')
            ? $this->assignment
            : $this->assignment()->withTrashed()->first();

        if (! $assignment || ! $assignment->deadline || ! $this->submitted_at) {
            return false;
        }

        return $this->submitted_at->greaterThan($assignment->deadline);
    }
}
