<?php

namespace App\Modules\Dashboard\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Modules\Dashboard\Services\DashboardService;
use App\Modules\Submissions\Resources\SubmissionResource;
use App\Shared\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService
    ) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success(
            $this->dashboardService->getOverview(),
            'Ringkasan dashboard berhasil diambil.'
        );
    }

    public function recentSubmissions(Request $request): JsonResponse
    {
        $query = Submission::query()
            ->with(['student', 'assignment', 'files'])
            ->withCount('files')
            ->latest('submitted_at');

        if ($class = $request->query('class')) {
            if ($class !== 'all') {
                $query->whereHas('student', fn ($q) => $q->where('class', $class));
            }
        }

        if ($assignmentId = $request->query('assignment_id')) {
            if ($assignmentId !== 'all') {
                $query->where('assignment_id', (int) $assignmentId);
            }
        }

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($timeliness = $request->query('timeliness')) {
            if ($timeliness === 'late') {
                $query->whereHas('assignment', function ($q) {
                    $q->withTrashed()
                        ->whereNotNull('deadline')
                        ->whereColumn('submissions.submitted_at', '>', 'assignments.deadline');
                });
            } elseif ($timeliness === 'on_time') {
                $query->whereHas('assignment', function ($q) {
                    $q->withTrashed()->where(function ($inner) {
                        $inner->whereNull('deadline')
                            ->orWhereColumn('submissions.submitted_at', '<=', 'assignments.deadline');
                    });
                });
            }
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('submitted_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('submitted_at', '<=', $dateTo);
        }

        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);
        $paginator = $query->paginate($perPage);

        return ApiResponse::paginated($paginator, SubmissionResource::collection($paginator->getCollection()));
    }
}
