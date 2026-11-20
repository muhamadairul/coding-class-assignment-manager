<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submission_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('submissions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->foreignId('assignment_id')->constrained('assignments')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->string('status', 30)->nullable();
            $table->unsignedInteger('file_count')->default(0);
            $table->dateTime('submitted_at');
            $table->timestamps();

            $table->index(['submission_id', 'submitted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submission_histories');
    }
};
