<?php

use App\Modules\Auth\Controllers\AdminAuthController;
use Illuminate\Support\Facades\Route;

Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:15,1');

Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AdminAuthController::class, 'logout']);
    Route::get('/me', [AdminAuthController::class, 'me']);
});
