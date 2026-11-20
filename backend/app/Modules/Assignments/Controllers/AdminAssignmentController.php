<?php

namespace App\Modules\Assignments\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentCategory;
use App\Models\Student;
use App\Modules\Assignments\Requests\StoreAssignmentRequest;
use App\Modules\Assignments\Requests\UpdateAssignmentRequest;
use App\Modules\Assignments\Resources\AssignmentCategoryResource;
use App\Modules\Assignments\Resources\AssignmentResource;
use App\Modules\Assignments\Services\AssignmentService;
use App\Modules\Students\Resources\StudentResource;
use App\Modules\Submissions\Resources\SubmissionResource;
use App\Shared\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAssignmentController extends Controller
{
    public function __construct(
        private readonly AssignmentService $assignmentService
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
        $query = Assignment::query()
            ->with('category')
            ->withCount('submissions');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        if ($classTarget = $request->query('class_target')) {
            if ($classTarget !== 'all_filter') {
                $query->where('class_target', $classTarget);
            }
        }

        if ($categoryId = $request->query('category_id')) {
            if ($categoryId !== 'all') {
                $query->where('category_id', (int) $categoryId);
            }
        }

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        $allowedSorts = ['created_at', 'title', 'deadline', 'start_date', 'status', 'submissions_count'];
        $sortBy = in_array($request->query('sort_by'), $allowedSorts, true)
            ? $request->query('sort_by')
            : 'created_at';
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortBy, $sortDir);

        $perPage = min(max((int) $request->query('per_page', 10), 1), 100);
        $paginator = $query->paginate($perPage);

        $studentCountsByClass = Student::query()
            ->selectRaw('class, COUNT(*) as total')
            ->groupBy('class')
            ->pluck('total', 'class');
        $totalStudents = (int) $studentCountsByClass->sum();

        $paginator->getCollection()->transform(function (Assignment $assignment) use ($studentCountsByClass, $totalStudents) {
            $target = $assignment->class_target;
            $targetCount = (! $target || $target === Assignment::CLASS_ALL)
                ? $totalStudents
                : (int) ($studentCountsByClass[$target] ?? 0);

            $assignment->target_students_count = $targetCount;
            $assignment->not_submitted_count = max(0, $targetCount - (int) $assignment->submissions_count);

            return $assignment;
        });

        return ApiResponse::paginated($paginator, AssignmentResource::collection($paginator->getCollection()));
    }

    public function store(StoreAssignmentRequest $request): JsonResponse
    {
        $assignment = $this->assignmentService->create(
            $request->validated(),
            $request->file('attachment'),
            $request->user()?->id
        );

        return ApiResponse::resource(new AssignmentResource($assignment), 'Tugas berhasil dibuat.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $assignment = Assignment::with('category')->withCount('submissions')->findOrFail($id);
        $statusSummary = $this->assignmentService->getStudentsStatus($assignment);

        $assignment->target_students_count = $statusSummary['total_target_students'];
        $assignment->not_submitted_count = $statusSummary['not_submitted_count'];

        return ApiResponse::success(
            (new AssignmentResource($assignment))->resolve(),
            'Detail tugas berhasil diambil.',
            200,
            [
                'summary' => [
                    'total_target_students' => $statusSummary['total_target_students'],
                    'submitted_count' => $statusSummary['submitted_count'],
                    'not_submitted_count' => $statusSummary['not_submitted_count'],
                    'late_count' => $statusSummary['late_count'],
                ],
            ]
        );
    }

    public function update(UpdateAssignmentRequest $request, int $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);

        $updated = $this->assignmentService->update(
            $assignment,
            $request->validated(),
            $request->file('attachment'),
            $request->boolean('remove_attachment')
        );

        return ApiResponse::resource(new AssignmentResource($updated), 'Tugas berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);
        $this->assignmentService->delete($assignment);

        return ApiResponse::success(
            null,
            'Tugas berhasil dihapus dengan aman. Riwayat pengumpulan siswa tetap tersimpan.'
        );
    }

    public function submissions(Request $request, int $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);

        $query = $assignment->submissions()
            ->with(['student', 'assignment', 'files'])
            ->latest('submitted_at');

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);
        $paginator = $query->paginate($perPage);

        return ApiResponse::paginated($paginator, SubmissionResource::collection($paginator->getCollection()));
    }

    public function studentsStatus(int $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);
        $status = $this->assignmentService->getStudentsStatus($assignment);

        return ApiResponse::success([
            'total_target_students' => $status['total_target_students'],
            'submitted_count' => $status['submitted_count'],
            'not_submitted_count' => $status['not_submitted_count'],
            'late_count' => $status['late_count'],
            'submitted_students' => $status['submitted_students']->map(function ($item) {
                return [
                    'student' => (new StudentResource($item['student']))->resolve(),
                    'submission' => (new SubmissionResource($item['submission']))->resolve(),
                    'is_late' => $item['is_late'],
                ];
            })->values(),
            'not_submitted_students' => StudentResource::collection($status['not_submitted_students'])->resolve(),
        ], 'Status pengumpulan siswa berhasil diambil.');
    }
}
