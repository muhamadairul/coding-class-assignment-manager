<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('description');
            $table->longText('instructions')->nullable();
            $table->string('class_target', 20)->nullable()->index();
            $table->string('attachment')->nullable();
            $table->string('attachment_original_name')->nullable();
            $table->dateTime('start_date')->nullable();
            $table->dateTime('deadline')->nullable()->index();
            $table->string('status', 20)->default('draft')->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
