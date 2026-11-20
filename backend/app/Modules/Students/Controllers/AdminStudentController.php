<?php

namespace App\Modules\Students\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Student;
use App\Models\Submission;
use App\Modules\Students\Requests\UpdateStudentRequest;
use App\Modules\Students\Resources\StudentResource;
use App\Modules\Students\Services\StudentService;
use App\Modules\Submissions\Resources\SubmissionHistoryResource;
use App\Modules\Submissions\Resources\SubmissionResource;
use App\Shared\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStudentController extends Controller
{
    public function __construct(
        private readonly StudentService $studentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Student::query();

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('nis', 'ilike', "%{$search}%");
            });
        }

        if ($class = $request->query('class')) {
            if ($class !== 'all') {
                $query->where('class', $class);
            }
        }

        $query->orderBy('class')->orderBy('name');

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);
        $paginator = $query->paginate($perPage);

        $publishedAssignments = Assignment::published()->get(['id', 'class_target']);
        $studentIds = $paginator->getCollection()->pluck('id');

        $submittedByStudent = Submission::query()
            ->whereIn('student_id', $studentIds)
            ->whereIn('assignment_id', $publishedAssignments->pluck('id'))
            ->get(['student_id', 'assignment_id'])
            ->groupBy('student_id')
            ->map(fn ($items) => $items->pluck('assignment_id')->unique());

        $paginator->getCollection()->transform(function (Student $student) use ($publishedAssignments, $submittedByStudent) {
            $relevantIds = $publishedAssignments
                ->filter(fn ($a) => $a->isTargetedToClass((string) $student->class))
                ->pluck('id');

            $submittedIds = $submittedByStudent->get($student->id, collect());
            $submittedCount = $relevantIds->intersect($submittedIds)->count();
            $totalCount = $relevantIds->count();

            $student->total_assignments = $totalCount;
            $student->submitted_assignments = $submittedCount;
            $student->not_submitted_assignments = max(0, $totalCount - $submittedCount);

            return $student;
        });

        return ApiResponse::paginated($paginator, StudentResource::collection($paginator->getCollection()));
    }

    public function show(int $id): JsonResponse
    {
        $student = Student::findOrFail($id);

        $assignments = Assignment::published()
            ->with('category')
            ->forClass($student->class)
            ->orderByDesc('created_at')
            ->get();

        $submissions = $student->submissions()
            ->with(['assignment', 'files', 'histories'])
            ->get()
            ->keyBy('assignment_id');

        $tasks = $assignments->map(function (Assignment $assignment) use ($submissions) {
            $submission = $submissions->get($assignment->id);
            $taskStatus = 'not_submitted';
            if ($submission) {
                $taskStatus = $submission->isLate() ? 'late' : 'submitted';
            }

            return [
                'assignment' => [
                    'id' => $assignment->id,
                    'title' => $assignment->title,
                    'slug' => $assignment->slug,
                    'class_target' => $assignment->class_target ?? Assignment::CLASS_ALL,
                    'category' => $assignment->category ? [
                        'id' => $assignment->category->id,
                        'name' => $assignment->category->name,
                    ] : null,
                    'deadline' => $assignment->deadline?->toIso8601String(),
                    'status' => $assignment->status,
                ],
                'task_status' => $taskStatus,
                'submission' => $submission ? (new SubmissionResource($submission))->resolve() : null,
                'histories' => $submission
                    ? SubmissionHistoryResource::collection($submission->histories)->resolve()
                    : [],
            ];
        });

        $totalAssignments = $assignments->count();
        $submittedCount = $tasks->whereNotNull('submission')->count();

        $student->total_assignments = $totalAssignments;
        $student->submitted_assignments = $submittedCount;
        $student->not_submitted_assignments = max(0, $totalAssignments - $submittedCount);

        return ApiResponse::success([
            'student' => (new StudentResource($student))->resolve(),
            'tasks' => $tasks->values(),
        ], 'Detail siswa berhasil diambil.');
    }

    public function update(UpdateStudentRequest $request, int $id): JsonResponse
    {
        $student = Student::findOrFail($id);
        $updated = $this->studentService->update($student, $request->validated());

        return ApiResponse::resource(new StudentResource($updated), 'Data siswa berhasil diperbarui.');
    }

    public function issueRecoveryToken(int $id): JsonResponse
    {
        $student = Student::findOrFail($id);
        $token = $this->studentService->issueToken($student, 7);

        return ApiResponse::success([
            'student' => (new StudentResource($student))->resolve(),
            'recovery_token' => $token,
            'expires_in_days' => 7,
        ], 'Token pemulihan akses siswa berhasil dibuat.', 201);
    }

    public function revokeTokens(int $id): JsonResponse
    {
        $student = Student::findOrFail($id);
        $revoked = $this->studentService->revokeAllTokens($student);

        return ApiResponse::success([
            'revoked_count' => $revoked,
        ], 'Seluruh token akses siswa berhasil dicabut.');
    }
}
