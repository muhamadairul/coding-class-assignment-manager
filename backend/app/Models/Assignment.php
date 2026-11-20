<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assignment extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    public const CLASS_ALL = 'all';
    public const CLASS_10 = '10';
    public const CLASS_11 = '11';

    protected $fillable = [
        'category_id',
        'created_by',
        'title',
        'slug',
        'description',
        'instructions',
        'class_target',
        'attachment',
        'attachment_original_name',
        'attachment_disk',
        'start_date',
        'deadline',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'deadline' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssignmentCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function submissionHistories(): HasMany
    {
        return $this->hasMany(SubmissionHistory::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    public function scopeForClass(Builder $query, ?string $studentClass): Builder
    {
        if (! $studentClass || $studentClass === self::CLASS_ALL) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($studentClass) {
            $q->whereNull('class_target')
                ->orWhere('class_target', self::CLASS_ALL)
                ->orWhere('class_target', $studentClass);
        });
    }

    public function isTargetedToClass(string $studentClass): bool
    {
        return $this->class_target === null
            || $this->class_target === ''
            || $this->class_target === self::CLASS_ALL
            || $this->class_target === $studentClass;
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }
}
