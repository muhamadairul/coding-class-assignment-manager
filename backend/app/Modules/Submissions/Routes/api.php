<?php

use App\Modules\Submissions\Controllers\AdminSubmissionController;
use App\Modules\Submissions\Controllers\PublicSubmissionController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::get('/submissions', [AdminSubmissionController::class, 'index']);
    Route::get('/submissions/{id}', [AdminSubmissionController::class, 'show'])->whereNumber('id');
    Route::put('/submissions/{id}/review', [AdminSubmissionController::class, 'review'])->whereNumber('id');
    Route::put('/submissions/{id}/request-revision', [AdminSubmissionController::class, 'requestRevision'])->whereNumber('id');
    Route::get('/submissions/{id}/download', [AdminSubmissionController::class, 'download'])->whereNumber('id');
    Route::get('/submissions/{id}/files/{fileId}/download', [AdminSubmissionController::class, 'downloadFile'])
        ->whereNumber(['id', 'fileId']);
});

Route::prefix('public')->group(function () {
    Route::post('/submissions', [PublicSubmissionController::class, 'store'])->middleware('throttle:20,1');

    Route::middleware('student.token')->group(function () {
        Route::post('/submissions/{id}/revision', [PublicSubmissionController::class, 'revision'])
            ->whereNumber('id')
            ->middleware('throttle:20,1');
        Route::get('/submissions/{id}/files/{fileId}/download', [PublicSubmissionController::class, 'downloadFile'])
            ->whereNumber(['id', 'fileId']);
    });
});
