<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Student;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminAuthAndAssignmentsTest extends TestCase
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

    public function test_admin_can_login_and_fetch_profile(): void
    {
        $response = $this->postJson('/api/v1/admin/login', [
            'email' => 'admin@test.local',
            'password' => 'Secret123!',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'data' => ['token', 'user' => ['id', 'name', 'email']],
            ]);

        $token = $response->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@test.local');
    }

    public function test_admin_login_fails_with_invalid_credentials(): void
    {
        $this->postJson('/api/v1/admin/login', [
            'email' => 'admin@test.local',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    public function test_unauthenticated_user_cannot_access_admin_endpoints(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertUnauthorized();
        $this->getJson('/api/v1/admin/assignments')->assertUnauthorized();
        $this->getJson('/api/v1/admin/students')->assertUnauthorized();
        $this->getJson('/api/v1/admin/submissions')->assertUnauthorized();
    }

    public function test_admin_can_crud_assignments_and_safe_delete_preserves_submissions(): void
    {
        $token = $this->admin->createToken('test')->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        // Create assignment with attachment
        $createRes = $this->withHeaders($headers)->post('/api/v1/admin/assignments', [
            'title' => 'Latihan Layout Grid',
            'description' => 'Buat halaman galeri foto menggunakan CSS Grid.',
            'instructions' => 'Minimal 6 foto dengan layout responsif.',
            'class_target' => '10',
            'deadline' => now()->addDays(5)->toIso8601String(),
            'status' => 'published',
            'attachment' => UploadedFile::fake()->create('panduan.pdf', 120, 'application/pdf'),
        ], ['Accept' => 'application/json']);

        $createRes->assertCreated()
            ->assertJsonPath('data.title', 'Latihan Layout Grid')
            ->assertJsonPath('data.has_attachment', true);

        $assignmentId = $createRes->json('data.id');

        // Read & List
        $this->withHeaders($headers)
            ->getJson("/api/v1/admin/assignments/{$assignmentId}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Latihan Layout Grid');

        // Update
        $this->withHeaders($headers)
            ->putJson("/api/v1/admin/assignments/{$assignmentId}", [
                'title' => 'Latihan Layout Grid Updated',
                'description' => 'Deskripsi baru',
                'class_target' => 'all',
                'status' => 'published',
            ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Latihan Layout Grid Updated');

        // Add a submission so we verify safe soft-delete preserves it
        $student = Student::create(['name' => 'Budi', 'nis' => '10001', 'class' => '10']);
        $submission = Submission::create([
            'student_id' => $student->id,
            'assignment_id' => $assignmentId,
            'submitted_at' => now(),
            'status' => Submission::STATUS_SUBMITTED,
        ]);

        // Safe delete
        $this->withHeaders($headers)
            ->deleteJson("/api/v1/admin/assignments/{$assignmentId}")
            ->assertOk();

        $this->assertSoftDeleted('assignments', ['id' => $assignmentId]);
        $this->assertDatabaseHas('submissions', ['id' => $submission->id]);

        // Draft/deleted assignments should not appear in public list
        $this->getJson('/api/v1/public/assignments')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
