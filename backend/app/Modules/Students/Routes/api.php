<?php

use App\Modules\Students\Controllers\AdminStudentController;
use App\Modules\Students\Controllers\PublicStudentController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/students', [AdminStudentController::class, 'index']);
    Route::get('/students/{id}', [AdminStudentController::class, 'show'])->whereNumber('id');
    Route::put('/students/{id}', [AdminStudentController::class, 'update'])->whereNumber('id');
    Route::post('/students/{id}/recovery-token', [AdminStudentController::class, 'issueRecoveryToken'])->whereNumber('id');
    Route::delete('/students/{id}/tokens', [AdminStudentController::class, 'revokeTokens'])->whereNumber('id');
});

Route::prefix('public')->group(function () {
    Route::post('/students/identify', [PublicStudentController::class, 'identify'])->middleware('throttle:30,1');
    Route::post('/students/recover', [PublicStudentController::class, 'recover'])->middleware('throttle:20,1');

    Route::middleware('student.token')->group(function () {
        Route::get('/me', [PublicStudentController::class, 'me']);
        Route::get('/me/assignments', [PublicStudentController::class, 'myAssignments']);
        Route::get('/me/submissions', [PublicStudentController::class, 'mySubmissions']);
        Route::get('/students/{nis}/assignments', [PublicStudentController::class, 'assignments']);
        Route::get('/students/{nis}/submissions', [PublicStudentController::class, 'submissions']);
    });
});
