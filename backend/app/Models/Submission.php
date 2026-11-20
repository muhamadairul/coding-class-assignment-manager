<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Submission extends Model
{
    use HasFactory;

    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_REVIEWED = 'reviewed';
    public const STATUS_REVISION_REQUIRED = 'revision_required';

    protected $fillable = [
        'student_id',
        'assignment_id',
        'submitted_at',
        'status',
        'notes',
        'admin_notes',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class)->withTrashed();
    }

    public function files(): HasMany
    {
        return $this->hasMany(SubmissionFile::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(SubmissionHistory::class)->orderByDesc('submitted_at');
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

    public function getTimelinessStatusAttribute(): string
    {
        return $this->isLate() ? 'late' : 'on_time';
    }
}
