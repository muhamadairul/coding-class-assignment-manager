<?php

use App\Modules\Assignments\Controllers\AdminAssignmentController;
use App\Modules\Assignments\Controllers\PublicAssignmentController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/categories', [AdminAssignmentController::class, 'categories']);
    Route::get('/assignments', [AdminAssignmentController::class, 'index']);
    Route::post('/assignments', [AdminAssignmentController::class, 'store']);
    Route::get('/assignments/{id}', [AdminAssignmentController::class, 'show'])->whereNumber('id');
    Route::put('/assignments/{id}', [AdminAssignmentController::class, 'update'])->whereNumber('id');
    Route::post('/assignments/{id}', [AdminAssignmentController::class, 'update'])->whereNumber('id');
    Route::delete('/assignments/{id}', [AdminAssignmentController::class, 'destroy'])->whereNumber('id');
    Route::get('/assignments/{id}/submissions', [AdminAssignmentController::class, 'submissions'])->whereNumber('id');
    Route::get('/assignments/{id}/students-status', [AdminAssignmentController::class, 'studentsStatus'])->whereNumber('id');
});

Route::prefix('public')->group(function () {
    Route::get('/categories', [PublicAssignmentController::class, 'categories']);
    Route::get('/assignments', [PublicAssignmentController::class, 'index']);
    Route::get('/assignments/{id}', [PublicAssignmentController::class, 'show'])->whereNumber('id');
    Route::get('/assignments/{id}/attachment', [PublicAssignmentController::class, 'downloadAttachment'])->whereNumber('id');
});
