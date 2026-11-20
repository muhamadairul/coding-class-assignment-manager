<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SubmissionSecurityAndReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->admin = User::create([
            'name' => 'Guru Coding',
            'email' => 'admin@test.local',
            'password' => Hash::make('Secret123!'),
        ]);
    }

    public function test_revision_flow_updates_existing_submission_and_records_history(): void
    {
        $assignment = Assignment::create([
            'title' => 'Tugas Revisi',
            'slug' => 'tugas-revisi',
            'description' => 'Buat program kalkulator',
            'class_target' => '10',
            'deadline' => now()->addDays(4),
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        // Initial submit
        $submitRes = $this->post('/api/v1/public/submissions', [
            'name' => 'Dina Marlina',
            'nis' => '1026501',
            'class' => '10',
            'assignment_id' => $assignment->id,
            'notes' => 'Versi pertama',
            'files' => [UploadedFile::fake()->create('v1.pdf', 100, 'application/pdf')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $submissionId = $submitRes->json('data.submission.id');
        $studentToken = $submitRes->json('data.student_token');

        // Re-submitting before revision requested must fail
        $this->withHeader('X-Student-Token', $studentToken)
            ->post("/api/v1/public/submissions/{$submissionId}/revision", [
                'notes' => 'Coba revisi tanpa izin',
                'files' => [UploadedFile::fake()->create('v2.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable();

        // Admin requests revision
        $adminToken = $this->admin->createToken('admin')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/submissions/{$submissionId}/request-revision", [
                'admin_notes' => 'Tolong lengkapi validasi pembagian nol.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Submission::STATUS_REVISION_REQUIRED);

        // Student submits revision
        $revRes = $this->withHeader('X-Student-Token', $studentToken)
            ->post("/api/v1/public/submissions/{$submissionId}/revision", [
                'notes' => 'Sudah ditambahkan validasi pembagian nol.',
                'files' => [
                    UploadedFile::fake()->create('v2.pdf', 120, 'application/pdf'),
                    UploadedFile::fake()->image('hasil.png', 300, 200),
                ],
            ], ['Accept' => 'application/json']);

        $revRes->assertOk()
            ->assertJsonPath('data.id', $submissionId)
            ->assertJsonPath('data.status', Submission::STATUS_SUBMITTED)
            ->assertJsonCount(2, 'data.files')
            ->assertJsonCount(2, 'data.histories');

        // Still only 1 active submission row
        $this->assertDatabaseCount('submissions', 1);
        $this->assertDatabaseCount('submission_histories', 2);

        // Admin marks as reviewed
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->putJson("/api/v1/admin/submissions/{$submissionId}/review", [
                'admin_notes' => 'Bagus, sudah lengkap!',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Submission::STATUS_REVIEWED);
    }

    public function test_student_cannot_access_other_student_files_or_data(): void
    {
        $assignment = Assignment::create([
            'title' => 'Tugas Rahasia',
            'slug' => 'tugas-rahasia',
            'description' => 'Uji keamanan IDOR',
            'class_target' => 'all',
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        // Student A submits
        $resA = $this->post('/api/v1/public/submissions', [
            'name' => 'Siswa A',
            'nis' => '1026901',
            'class' => '10',
            'assignment_id' => $assignment->id,
            'files' => [UploadedFile::fake()->create('rahasia.pdf', 100, 'application/pdf')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $submissionAId = $resA->json('data.submission.id');
        $fileAId = $resA->json('data.submission.files.0.id');
        $tokenA = $resA->json('data.student_token');

        // Student B identifies
        $resB = $this->postJson('/api/v1/public/students/identify', [
            'name' => 'Siswa B',
            'nis' => '1026902',
            'class' => '10',
        ])->assertCreated();
        $tokenB = $resB->json('data.student_token');

        // Without token -> 401
        $this->getJson("/api/v1/public/students/1026901/submissions")->assertUnauthorized();
        $this->get("/api/v1/public/submissions/{$submissionAId}/files/{$fileAId}/download", ['Accept' => 'application/json'])
            ->assertUnauthorized();

        // Student B tries to access Student A's data and file -> 403
        $this->withHeader('X-Student-Token', $tokenB)
            ->getJson('/api/v1/public/students/1026901/submissions')
            ->assertForbidden();

        $this->withHeader('X-Student-Token', $tokenB)
            ->get("/api/v1/public/submissions/{$submissionAId}/files/{$fileAId}/download", ['Accept' => 'application/json'])
            ->assertForbidden();

        // Student A can download their own file -> 200
        $this->withHeader('X-Student-Token', $tokenA)
            ->get("/api/v1/public/submissions/{$submissionAId}/files/{$fileAId}/download")
            ->assertOk();
    }
}
