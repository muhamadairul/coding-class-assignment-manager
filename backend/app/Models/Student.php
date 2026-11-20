<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    public const VALID_CLASSES = ['10', '11'];

    protected $fillable = [
        'name',
        'nis',
        'class',
    ];

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function submissionHistories(): HasMany
    {
        return $this->hasMany(SubmissionHistory::class);
    }

    public function accessTokens(): HasMany
    {
        return $this->hasMany(StudentAccessToken::class);
    }
}
