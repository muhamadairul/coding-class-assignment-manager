<?php

namespace App\Modules\Submissions\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Models\SubmissionFile;
use App\Modules\Submissions\Requests\RequestRevisionRequest;
use App\Modules\Submissions\Requests\ReviewSubmissionRequest;
use App\Modules\Submissions\Resources\SubmissionResource;
use App\Modules\Submissions\Services\SubmissionService;
use App\Shared\Contracts\FileStorageInterface;
use App\Shared\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class AdminSubmissionController extends Controller
{
    public function __construct(
        private readonly SubmissionService $submissionService,
        private readonly FileStorageInterface $fileStorage
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Submission::query()
            ->with(['student', 'assignment', 'files'])
            ->withCount('files')
            ->latest('submitted_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('student', function ($sq) use ($search) {
                    $sq->where('name', 'ilike', "%{$search}%")
                        ->orWhere('nis', 'ilike', "%{$search}%");
                })->orWhereHas('assignment', function ($aq) use ($search) {
                    $aq->withTrashed()->where('title', 'ilike', "%{$search}%");
                });
            });
        }

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

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);
        $paginator = $query->paginate($perPage);

        return ApiResponse::paginated($paginator, SubmissionResource::collection($paginator->getCollection()));
    }

    public function show(int $id): JsonResponse
    {
        $submission = Submission::with(['student', 'assignment', 'files', 'histories'])
            ->findOrFail($id);

        return ApiResponse::resource(new SubmissionResource($submission), 'Detail pengumpulan berhasil diambil.');
    }

    public function review(ReviewSubmissionRequest $request, int $id): JsonResponse
    {
        $submission = Submission::findOrFail($id);
        $updated = $this->submissionService->markReviewed(
            $submission,
            $request->validated('admin_notes')
        );

        return ApiResponse::resource(
            new SubmissionResource($updated),
            'Pengumpulan berhasil ditandai sebagai Reviewed.'
        );
    }

    public function requestRevision(RequestRevisionRequest $request, int $id): JsonResponse
    {
        $submission = Submission::findOrFail($id);
        $updated = $this->submissionService->requestRevision(
            $submission,
            $request->validated('admin_notes')
        );

        return ApiResponse::resource(
            new SubmissionResource($updated),
            'Permintaan revisi berhasil dikirim ke siswa.'
        );
    }

    public function download(int $id): BinaryFileResponse|StreamedResponse|JsonResponse
    {
        $submission = Submission::with(['student', 'assignment', 'files'])->findOrFail($id);

        if ($submission->files->isEmpty()) {
            return ApiResponse::error('Tidak ada file pada pengumpulan ini.', 404);
        }

        if ($submission->files->count() === 1) {
            $file = $submission->files->first();
            $disk = $file->disk ?: 'local';
            if (! $this->fileStorage->exists($file->file_path, $disk)) {
                return ApiResponse::error('File tidak ditemukan di penyimpanan.', 404);
            }

            return $this->fileStorage->streamDownload($file->file_path, $file->original_name, $disk);
        }

        $zipName = Str::slug($submission->student->nis.'-'.$submission->assignment->title).'-files.zip';
        $tmpZipPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'ccam_'.Str::uuid().'.zip';

        $zip = new ZipArchive();
        if ($zip->open($tmpZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return ApiResponse::error('Gagal membuat arsip ZIP.', 500);
        }

        $usedNames = [];
        foreach ($submission->files as $file) {
            $disk = $file->disk ?: 'local';
            if (! $this->fileStorage->exists($file->file_path, $disk)) {
                continue;
            }
            $entryName = $file->original_name;
            if (isset($usedNames[$entryName])) {
                $usedNames[$entryName]++;
                $info = pathinfo($entryName);
                $ext = isset($info['extension']) ? '.'.$info['extension'] : '';
                $entryName = ($info['filename'] ?? 'file').'_'.$usedNames[$entryName].$ext;
            } else {
                $usedNames[$entryName] = 1;
            }
            $zip->addFromString($entryName, $this->fileStorage->getContents($file->file_path, $disk));
        }
        $zip->close();

        return response()->download($tmpZipPath, $zipName)->deleteFileAfterSend(true);
    }

    public function downloadFile(Request $request, int $id, int $fileId): StreamedResponse|JsonResponse
    {
        $file = SubmissionFile::where('submission_id', $id)
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
