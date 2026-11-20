<?php

namespace App\Modules\Assignments\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentCategory;
use App\Models\StudentAccessToken;
use App\Modules\Assignments\Resources\AssignmentCategoryResource;
use App\Modules\Assignments\Resources\AssignmentResource;
use App\Shared\Contracts\FileStorageInterface;
use App\Shared\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicAssignmentController extends Controller
{
    public function __construct(
        private readonly FileStorageInterface $fileStorage
    ) {}

    public function categories(): JsonResponse
    {
        $categories = AssignmentCategory::orderBy('name')->get();

        return ApiResponse::success(
            AssignmentCategoryResource::collection($categories)->resolve(),
            'Daftar kategori tugas berhasil diambil.'
        );
    }

    public function index(Request $request): JsonResponse
    {
        $query = Assignment::published()->with('category');

        if ($class = $request->query('class')) {
            if (in_array($class, ['10', '11'], true)) {
                $query->forClass($class);
            }
        }

        if ($categoryId = $request->query('category_id')) {
            if ($categoryId !== 'all') {
                $query->where('category_id', (int) $categoryId);
            }
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        $query->orderByRaw('CASE WHEN deadline IS NULL THEN 1 ELSE 0 END')
            ->orderBy('deadline', 'asc')
            ->orderByDesc('created_at');

        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);
        $paginator = $query->paginate($perPage);

        return ApiResponse::paginated($paginator, AssignmentResource::collection($paginator->getCollection()));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $assignment = Assignment::published()->with('category')->findOrFail($id);

        $rawToken = $request->header('X-Student-Token');
        if (is_string($rawToken) && trim($rawToken) !== '') {
            $tokenRecord = StudentAccessToken::with('student')
                ->where('token_hash', hash('sha256', trim($rawToken)))
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->first();

            if ($tokenRecord && $tokenRecord->student) {
                $submission = $assignment->submissions()
                    ->where('student_id', $tokenRecord->student->id)
                    ->with(['files', 'histories', 'assignment'])
                    ->first();

                $assignment->student_submission = $submission;
                $assignment->student_task_status = $submission
                    ? ($submission->isLate() ? 'late' : 'submitted')
                    : 'not_submitted';
            }
        }

        return ApiResponse::resource(new AssignmentResource($assignment), 'Detail tugas berhasil diambil.');
    }

    public function downloadAttachment(int $id): StreamedResponse|JsonResponse
    {
        $assignment = Assignment::published()->findOrFail($id);
        $disk = $assignment->attachment_disk ?: 'local';

        if (! $assignment->attachment || ! $this->fileStorage->exists($assignment->attachment, $disk)) {
            return ApiResponse::error('Lampiran tugas tidak ditemukan.', 404);
        }

        return $this->fileStorage->streamDownload(
            $assignment->attachment,
            $assignment->attachment_original_name ?: basename($assignment->attachment),
            $disk
        );
    }
}
