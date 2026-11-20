<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::table('assignments', function (Blueprint $table) {
            $table->foreignId('category_id')
                ->nullable()
                ->after('id')
                ->constrained('assignment_categories')
                ->nullOnDelete();
            $table->foreignId('created_by')
                ->nullable()
                ->after('status')
                ->constrained('users')
                ->nullOnDelete();
            $table->string('attachment_disk', 30)
                ->default('local')
                ->after('attachment_original_name');
        });

        Schema::table('submission_files', function (Blueprint $table) {
            $table->string('disk', 30)->default('local')->after('file_path');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('submission_files', function (Blueprint $table) {
            $table->dropColumn('disk');
        });

        Schema::table('assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('attachment_disk');
        });

        Schema::dropIfExists('assignment_categories');
    }
};
