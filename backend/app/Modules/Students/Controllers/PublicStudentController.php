<?php

namespace App\Modules\Students\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Student;
use App\Modules\Assignments\Resources\AssignmentResource;
use App\Modules\Students\Requests\IdentifyStudentRequest;
use App\Modules\Students\Requests\RecoverStudentRequest;
use App\Modules\Students\Resources\StudentResource;
use App\Modules\Students\Services\StudentService;
use App\Modules\Submissions\Resources\SubmissionResource;
use App\Shared\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicStudentController extends Controller
{
    public function __construct(
        private readonly StudentService $studentService
    ) {}

    public function identify(IdentifyStudentRequest $request): JsonResponse
    {
        $result = $this->studentService->identify(
            $request->validated('name'),
            $request->validated('nis'),
            $request->validated('class'),
            $request->boolean('confirm_existing')
        );

        if ($result['status'] === 'mismatch') {
            return ApiResponse::error(
                'NIS sudah terdaftar dengan nama atau kelas yang berbeda. Konfirmasi untuk menggunakan data siswa yang terdaftar atau hubungi guru untuk koreksi.',
                409,
                null,
                [
                    'requires_confirmation' => true,
                    'existing_student' => [
                        'nis' => $result['student']->nis,
                        'name' => $result['student']->name,
                        'class' => $result['student']->class,
                    ],
                ]
            );
        }

        return ApiResponse::success(
            [
                'status' => $result['status'],
                'student' => (new StudentResource($result['student']))->resolve(),
                'student_token' => $result['token'],
            ],
            $result['status'] === 'created'
                ? 'Identitas siswa berhasil didaftarkan.'
                : 'Identitas siswa berhasil diverifikasi.',
            $result['status'] === 'created' ? 201 : 200
        );
    }

    public function recover(RecoverStudentRequest $request): JsonResponse
    {
        $token = $request->validated('token');
        $student = $this->studentService->verifyToken($token);

        if (! $student) {
            return ApiResponse::error('Token pemulihan tidak valid atau sudah kedaluwarsa.', 401);
        }

        return ApiResponse::success([
            'student' => (new StudentResource($student))->resolve(),
            'student_token' => $token,
        ], 'Akses portal siswa berhasil dipulihkan.');
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->attributes->get('student');

        return ApiResponse::resource(new StudentResource($student), 'Data siswa aktif.');
    }

    public function myAssignments(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->attributes->get('student');

        return $this->buildAssignmentsForStudent($request, $student);
    }

    public function mySubmissions(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->attributes->get('student');

        return $this->buildSubmissionsForStudent($request, $student);
    }

    public function assignments(Request $request, string $nis): JsonResponse
    {
        /** @var Student $student */
        $student = $request->attributes->get('student');

        return $this->buildAssignmentsForStudent($request, $student);
    }

    public function submissions(Request $request, string $nis): JsonResponse
    {
        /** @var Student $student */
        $student = $request->attributes->get('student');

        return $this->buildSubmissionsForStudent($request, $student);
    }

    private function buildAssignmentsForStudent(Request $request, Student $student): JsonResponse
    {
        $query = Assignment::published()
            ->with('category')
            ->forClass($student->class);

        if ($categoryId = $request->query('category_id')) {
            if ($categoryId !== 'all') {
                $query->where('category_id', (int) $categoryId);
            }
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        $assignments = $query
            ->orderByRaw('CASE WHEN deadline IS NULL THEN 1 ELSE 0 END')
            ->orderBy('deadline', 'asc')
            ->orderByDesc('created_at')
            ->get();

        $submissions = $student->submissions()
            ->with(['files', 'histories', 'assignment'])
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->get()
            ->keyBy('assignment_id');

        $tab = $request->query('tab', 'all');

        $enriched = $assignments->map(function (Assignment $assignment) use ($submissions) {
            $submission = $submissions->get($assignment->id);
            $assignment->student_submission = $submission;
            $assignment->student_task_status = $submission
                ? ($submission->isLate() ? 'late' : 'submitted')
                : 'not_submitted';

            return $assignment;
        });

        $counts = [
            'all' => $enriched->count(),
            'not_submitted' => $enriched->where('student_task_status', 'not_submitted')->count(),
            'submitted' => $enriched->whereIn('student_task_status', ['submitted', 'late'])->count(),
        ];

        $filtered = match ($tab) {
            'not_submitted' => $enriched->where('student_task_status', 'not_submitted')->values(),
            'submitted' => $enriched->whereIn('student_task_status', ['submitted', 'late'])->values(),
            default => $enriched->values(),
        };

        return ApiResponse::success(
            AssignmentResource::collection($filtered)->resolve(),
            'Daftar tugas siswa berhasil diambil.',
            200,
            [
                'student' => (new StudentResource($student))->resolve(),
                'counts' => $counts,
            ]
        );
    }

    private function buildSubmissionsForStudent(Request $request, Student $student): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 50);

        $paginator = $student->submissions()
            ->with(['assignment.category', 'files', 'histories'])
            ->latest('submitted_at')
            ->paginate($perPage);

        return ApiResponse::paginated($paginator, SubmissionResource::collection($paginator->getCollection()));
    }
}
