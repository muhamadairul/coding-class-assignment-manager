<?php

namespace App\Shared\Middleware;

use App\Models\StudentAccessToken;
use App\Shared\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyStudentToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $rawToken = $request->header('X-Student-Token')
            ?? $request->query('student_token');

        if (! is_string($rawToken) || trim($rawToken) === '') {
            return ApiResponse::error(
                'Token akses siswa diperlukan. Silakan identifikasi NIS terlebih dahulu.',
                401
            );
        }

        $tokenHash = hash('sha256', trim($rawToken));

        $tokenRecord = StudentAccessToken::with('student')
            ->where('token_hash', $tokenHash)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        if (! $tokenRecord || ! $tokenRecord->student) {
            return ApiResponse::error(
                'Token akses siswa tidak valid atau sudah kedaluwarsa.',
                401
            );
        }

        $routeNis = $request->route('nis');
        if ($routeNis !== null && (string) $tokenRecord->student->nis !== (string) $routeNis) {
            return ApiResponse::error(
                'Anda tidak memiliki izin untuk mengakses data siswa lain.',
                403
            );
        }

        $tokenRecord->forceFill(['last_used_at' => now()])->save();
        $request->attributes->set('student', $tokenRecord->student);

        return $next($request);
    }
}
