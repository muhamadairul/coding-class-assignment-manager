<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\AssignmentCategory;
use App\Models\Student;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ModularPlatformTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('s3');

        $this->admin = User::create([
            'name' => 'Guru Coding',
            'email' => 'admin@test.local',
            'password' => Hash::make('Secret123!'),
        ]);
    }

    public function test_health_endpoint_returns_healthy_json(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'healthy')
            ->assertJsonPath('data.database', 'connected');
    }

    public function test_admin_can_filter_assignments_by_category_and_dashboard_calculates_accurately(): void
    {
        $catJs = AssignmentCategory::create(['name' => 'JavaScript', 'slug' => 'javascript']);
        $catPhp = AssignmentCategory::create(['name' => 'PHP', 'slug' => 'php']);

        $token = $this->admin->createToken('test')->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        $a1 = Assignment::create([
            'category_id' => $catJs->id,
            'created_by' => $this->admin->id,
            'title' => 'JS DOM',
            'slug' => 'js-dom',
            'description' => 'Latihan DOM JavaScript',
            'class_target' => '10',
            'deadline' => now()->addDays(2),
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        Assignment::create([
            'category_id' => $catPhp->id,
            'created_by' => $this->admin->id,
            'title' => 'PHP OOP',
            'slug' => 'php-oop',
            'description' => 'Latihan OOP PHP',
            'class_target' => '11',
            'deadline' => now()->addDays(2),
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        $s1 = Student::create(['name' => 'Siswa 10A', 'nis' => '1001', 'class' => '10']);
        Student::create(['name' => 'Siswa 10B', 'nis' => '1002', 'class' => '10']);

        Submission::create([
            'student_id' => $s1->id,
            'assignment_id' => $a1->id,
            'submitted_at' => now(),
            'status' => Submission::STATUS_SUBMITTED,
        ]);

        // Filter public assignments by category
        $this->getJson("/api/v1/public/assignments?category_id={$catJs->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.category.slug', 'javascript');

        // Dashboard stats
        $this->withHeaders($headers)
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.stats.total_assignments', 2)
            ->assertJsonPath('data.stats.active_assignments', 2)
            ->assertJsonPath('data.stats.total_students', 2)
            ->assertJsonPath('data.stats.total_submissions', 1)
            ->assertJsonPath('data.stats.students_not_submitted', 1);
    }

    public function test_student_me_endpoints_and_admin_recovery_token_flow(): void
    {
        $adminToken = $this->admin->createToken('admin')->plainTextToken;
        $student = Student::create(['name' => 'Budi Santoso', 'nis' => '1026777', 'class' => '10']);

        Assignment::create([
            'title' => 'Tugas Kelas 10',
            'slug' => 'tugas-kelas-10',
            'description' => 'Deskripsi tugas',
            'class_target' => '10',
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        // Admin issues recovery token for student switching devices
        $recRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/students/{$student->id}/recovery-token")
            ->assertCreated()
            ->assertJsonPath('success', true);

        $recoveryToken = $recRes->json('data.recovery_token');

        // Student verifies recovery token
        $this->postJson('/api/v1/public/students/recover', ['token' => $recoveryToken])
            ->assertOk()
            ->assertJsonPath('data.student.nis', '1026777');

        // Access /public/me and /public/me/assignments using token
        $this->withHeader('X-Student-Token', $recoveryToken)
            ->getJson('/api/v1/public/me')
            ->assertOk()
            ->assertJsonPath('data.nis', '1026777');

        $this->withHeader('X-Student-Token', $recoveryToken)
            ->getJson('/api/v1/public/me/assignments')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');

        // Admin revokes all tokens -> token no longer works
        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->deleteJson("/api/v1/admin/students/{$student->id}/tokens")
            ->assertOk()
            ->assertJsonPath('data.revoked_count', 1);

        $this->withHeader('X-Student-Token', $recoveryToken)
            ->getJson('/api/v1/public/me')
            ->assertUnauthorized();
    }

    public function test_submission_works_with_s3_r2_storage_disk_abstraction(): void
    {
        config(['filesystems.default' => 's3']);

        $assignment = Assignment::create([
            'title' => 'Tugas R2 Storage',
            'slug' => 'tugas-r2-storage',
            'description' => 'Uji upload ke S3/R2',
            'class_target' => 'all',
            'status' => Assignment::STATUS_PUBLISHED,
        ]);

        $res = $this->post('/api/v1/public/submissions', [
            'name' => 'R2 Tester',
            'nis' => '1125999',
            'class' => '11',
            'assignment_id' => $assignment->id,
            'files' => [UploadedFile::fake()->create('project.zip', 200, 'application/zip')],
        ], ['Accept' => 'application/json']);

        $res->assertCreated()->assertJsonPath('success', true);

        $this->assertDatabaseHas('submission_files', [
            'original_name' => 'project.zip',
            'disk' => 's3',
        ]);
    }
}
