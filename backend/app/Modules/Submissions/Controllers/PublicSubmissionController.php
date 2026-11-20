<?php

namespace App\Modules\Submissions\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Student;
use App\Models\Submission;
use App\Models\SubmissionFile;
use App\Modules\Students\Resources\StudentResource;
use App\Modules\Students\Services\StudentService;
use App\Modules\Submissions\Requests\StoreSubmissionRequest;
use App\Modules\Submissions\Requests\SubmitRevisionRequest;
use App\Modules\Submissions\Resources\SubmissionResource;
use App\Modules\Submissions\Services\SubmissionService;
use App\Shared\Contracts\FileStorageInterface;
use App\Shared\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicSubmissionController extends Controller
{
    public function __construct(
        private readonly StudentService $studentService,
        private readonly SubmissionService $submissionService,
        private readonly FileStorageInterface $fileStorage
    ) {}

    public function store(StoreSubmissionRequest $request): JsonResponse
    {
        $identifyResult = $this->studentService->identify(
            $request->validated('name'),
            $request->validated('nis'),
            $request->validated('class'),
            $request->boolean('confirm_existing')
        );

        if ($identifyResult['status'] === 'mismatch') {
            return ApiResponse::error(
                'NIS sudah terdaftar dengan nama atau kelas yang berbeda. Konfirmasi untuk menggunakan data siswa yang sudah ada.',
                409,
                null,
                [
                    'requires_confirmation' => true,
                    'existing_student' => [
                        'nis' => $identifyResult['student']->nis,
                        'name' => $identifyResult['student']->name,
                        'class' => $identifyResult['student']->class,
                    ],
                ]
            );
        }

        /** @var Student $student */
        $student = $identifyResult['student'];
        $assignment = Assignment::findOrFail((int) $request->validated('assignment_id'));

        $submission = $this->submissionService->submit(
            $student,
            $assignment,
            $request->file('files', []),
            $request->validated('notes')
        );

        return ApiResponse::success([
            'submission' => (new SubmissionResource($submission))->resolve(),
            'student' => (new StudentResource($student))->resolve(),
            'student_token' => $identifyResult['token'],
        ], 'Tugas berhasil dikumpulkan.', 201);
    }

    public function revision(SubmitRevisionRequest $request, int $id): JsonResponse
    {
        /** @var Student $student */
        $student = $request->attributes->get('student');
        $submission = Submission::with(['assignment', 'files'])->findOrFail($id);

        $updated = $this->submissionService->submitRevision(
            $submission,
            $student,
            $request->file('files', []),
            $request->validated('notes')
        );

        return ApiResponse::resource(new SubmissionResource($updated), 'Revisi tugas berhasil dikirim.');
    }

    public function downloadFile(Request $request, int $id, int $fileId): StreamedResponse|JsonResponse
    {
        /** @var Student $student */
        $student = $request->attributes->get('student');

        $submission = Submission::findOrFail($id);
        if ($submission->student_id !== $student->id) {
            return ApiResponse::error(
                'Anda tidak memiliki izin untuk mengunduh file milik siswa lain.',
                403
            );
        }

        $file = SubmissionFile::where('submission_id', $submission->id)
            ->where('id', $fileId)
            ->firstOrFail();

        $disk = $file->disk ?: 'local';
        if (! $this->fileStorage->exists($file->file_path, $disk)) {
            return ApiResponse::error('File tidak ditemukan di penyimpanan.', 404);
        }

        return $this->fileStorage->streamDownload(
            $file->file_path,
            $file->original_name,
            $disk,
            $request->boolean('inline') && $file->isImage(),
            $file->mime_type
        );
    }
}
