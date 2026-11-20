<?php

use App\Modules\Dashboard\Controllers\AdminDashboardController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index']);
    Route::get('/dashboard/recent-submissions', [AdminDashboardController::class, 'recentSubmissions']);
});
