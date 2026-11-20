<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Student;
use App\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentIdentificationAndSubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_new_student_identification_creates_student_and_issues_token(): void
    {
        $res = $this->postJson('/api/v1/public/students/identify', [
            'name' => 'Rani Kusuma',
            'nis' => '1026099',
            'class' => '10',
        ]);

        $res->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'created')
            ->assertJsonPath('data.student.nis', '1026099')
            ->assertJsonStructure(['data' => ['student', 'student_token']]);

        $this->assertDatabaseCount('students', 1);
    }

    public function test_existing_nis_reuses_student_without_duplicating_and_prompts_on_mismatch(): void
    {
        Student::create(['name' => 'Rani Kusuma', 'nis' => '1026099', 'class' => '10']);

        // Matching identity -> reuses existing
        $this->postJson('/api/v1/public/students/identify', [
            'name' => 'Rani Kusuma',
            'nis' => '1026099',
            'class' => '10',
        ])->assertOk()
            ->assertJsonPath('data.status', 'existing');

        $this->assertDatabaseCount('students', 1);

        // Mismatching name/class -> 409 confirmation required, does NOT overwrite
        $this->postJson('/api/v1/public/students/identify', [
            'name' => 'Nama Berbeda',
            'nis' => '1026099',
            'class' => '11',
        ])->assertStatus(409)
            ->assertJsonPath('requires_confirmation', true)
            ->assertJsonPath('existing_student.name', 'Rani Kusuma');

        // Confirm existing -> uses existing record without overwriting
        $this->postJson('/api/v1/public/students/identify', [
            'name' => 'Nama Berbeda',
            'nis' => '1026099',
            'class' => '11',
            'confirm_existing' => true,
        ])->assertOk()
            ->assertJsonPath('data.student.name', 'Rani Kusuma')
            ->assertJsonPath('data.student.class', '10');

        $this->assertDatabaseHas('students', [
            'nis' => '1026099',
            'name' => 'Rani Kusuma',
            'class' => '10',
        ]);
    }

    public function test_student_can_submit_multiple_files_and_auto_create_student(): void
    {
        $assignment = Assignment::create([
            'title' => 'Tugas HTML',
            'slug' => 'tugas-html',
            'description' => 'Buat halaman web',
            'class_target' => '10',
            'deadline' => now()->addDays(2),
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        $res = $this->post('/api/v1/public/submissions', [
            'name' => 'Andi Wijaya',
            'nis' => '1026111',
            'class' => '10',
            'assignment_id' => $assignment->id,
            'notes' => 'Sudah saya kerjakan semua.',
            'files' => [
                UploadedFile::fake()->image('screen1.png', 400, 300),
                UploadedFile::fake()->image('screen2.jpg', 400, 300),
                UploadedFile::fake()->create('laporan.pdf', 200, 'application/pdf'),
                UploadedFile::fake()->create('source.zip', 300, 'application/zip'),
            ],
        ], ['Accept' => 'application/json']);

        $res->assertCreated()
            ->assertJsonPath('data.submission.is_late', false)
            ->assertJsonPath('data.submission.timeliness_status', 'on_time')
            ->assertJsonPath('data.submission.status', 'submitted')
            ->assertJsonCount(4, 'data.submission.files');

        $this->assertDatabaseHas('students', ['nis' => '1026111']);
        $this->assertDatabaseCount('submission_files', 4);
        $this->assertDatabaseCount('submission_histories', 1);
    }

    public function test_late_submission_is_allowed_and_marked_late(): void
    {
        $assignment = Assignment::create([
            'title' => 'Tugas Terlewat',
            'slug' => 'tugas-terlewat',
            'description' => 'Deadline sudah lewat',
            'class_target' => 'all',
            'deadline' => now()->subHours(5),
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        $res = $this->post('/api/v1/public/submissions', [
            'name' => 'Siti Aminah',
            'nis' => '1125888',
            'class' => '11',
            'assignment_id' => $assignment->id,
            'files' => [
                UploadedFile::fake()->create('tugas.pdf', 100, 'application/pdf'),
            ],
        ], ['Accept' => 'application/json']);

        $res->assertCreated()
            ->assertJsonPath('data.submission.is_late', true)
            ->assertJsonPath('data.submission.timeliness_status', 'late')
            ->assertJsonPath('data.submission.status', 'submitted');
    }

    public function test_student_cannot_submit_assignment_for_different_class(): void
    {
        $assignment = Assignment::create([
            'title' => 'Khusus Kelas 11',
            'slug' => 'khusus-kelas-11',
            'description' => 'Hanya untuk kelas 11',
            'class_target' => '11',
            'deadline' => now()->addDays(3),
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        $this->post('/api/v1/public/submissions', [
            'name' => 'Siswa Kelas 10',
            'nis' => '1026222',
            'class' => '10',
            'assignment_id' => $assignment->id,
            'files' => [
                UploadedFile::fake()->create('tugas.pdf', 100, 'application/pdf'),
            ],
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assignment_id']);
    }

    public function test_dangerous_file_types_and_oversized_files_are_rejected(): void
    {
        $assignment = Assignment::create([
            'title' => 'Tugas Validasi File',
            'slug' => 'tugas-validasi-file',
            'description' => 'Cek validasi file',
            'class_target' => 'all',
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        // Reject PHP file
        $this->post('/api/v1/public/submissions', [
            'name' => 'Tester',
            'nis' => '1026333',
            'class' => '10',
            'assignment_id' => $assignment->id,
            'files' => [
                UploadedFile::fake()->create('shell.php', 10, 'application/x-httpd-php'),
            ],
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['files']);

        // Reject file > 10MB (10240 KB)
        $this->post('/api/v1/public/submissions', [
            'name' => 'Tester',
            'nis' => '1026333',
            'class' => '10',
            'assignment_id' => $assignment->id,
            'files' => [
                UploadedFile::fake()->create('huge.pdf', 11000, 'application/pdf'),
            ],
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['files.0']);
    }
}
