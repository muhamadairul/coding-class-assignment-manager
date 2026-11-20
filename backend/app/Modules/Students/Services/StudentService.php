<?php

namespace App\Modules\Students\Services;

use App\Models\Student;
use App\Models\StudentAccessToken;
use Illuminate\Support\Str;

class StudentService
{
    /**
     * @return array{
     *   status: 'created'|'existing'|'mismatch',
     *   student: Student,
     *   token?: string,
     *   requires_confirmation?: bool
     * }
     */
    public function identify(string $name, string $nis, string $class, bool $confirmExisting = false): array
    {
        $normalizedNis = trim($nis);
        $normalizedName = trim($name);
        $normalizedClass = trim($class);

        $existing = Student::where('nis', $normalizedNis)->first();

        if (! $existing) {
            $student = Student::create([
                'name' => $normalizedName,
                'nis' => $normalizedNis,
                'class' => $normalizedClass,
            ]);

            return [
                'status' => 'created',
                'student' => $student,
                'token' => $this->issueToken($student),
            ];
        }

        $nameMatches = mb_strtolower($existing->name) === mb_strtolower($normalizedName);
        $classMatches = (string) $existing->class === (string) $normalizedClass;

        if ((! $nameMatches || ! $classMatches) && ! $confirmExisting) {
            return [
                'status' => 'mismatch',
                'student' => $existing,
                'requires_confirmation' => true,
            ];
        }

        return [
            'status' => 'existing',
            'student' => $existing,
            'token' => $this->issueToken($existing),
        ];
    }

    public function issueToken(Student $student, int $days = 30): string
    {
        $plainTextToken = Str::random(64);

        StudentAccessToken::create([
            'student_id' => $student->id,
            'token_hash' => hash('sha256', $plainTextToken),
            'last_used_at' => now(),
            'expires_at' => now()->addDays($days),
        ]);

        return $plainTextToken;
    }

    public function verifyToken(string $plainTextToken): ?Student
    {
        $record = StudentAccessToken::with('student')
            ->where('token_hash', hash('sha256', trim($plainTextToken)))
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if (! $record || ! $record->student) {
            return null;
        }

        $record->forceFill(['last_used_at' => now()])->save();

        return $record->student;
    }

    public function revokeAllTokens(Student $student): int
    {
        return $student->accessTokens()->delete();
    }

    public function update(Student $student, array $data): Student
    {
        $student->update([
            'name' => trim($data['name']),
            'class' => trim($data['class']),
        ]);

        return $student->fresh();
    }
}
