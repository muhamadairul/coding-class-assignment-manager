<?php

use App\Shared\Support\ApiResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Health check endpoint for Render / Docker
Route::get('/health', function () {
    try {
        DB::select('SELECT 1');

        return ApiResponse::success([
            'status' => 'healthy',
            'database' => 'connected',
            'storage_disk' => config('filesystems.default'),
            'timestamp' => now()->toIso8601String(),
        ], 'Service is healthy.');
    } catch (\Throwable $e) {
        return ApiResponse::error('Service unhealthy: database connection failed.', 503);
    }
});

Route::prefix('v1')->group(function () {
    require app_path('Modules/Auth/Routes/api.php');
    require app_path('Modules/Dashboard/Routes/api.php');
    require app_path('Modules/Assignments/Routes/api.php');
    require app_path('Modules/Students/Routes/api.php');
    require app_path('Modules/Submissions/Routes/api.php');
});
