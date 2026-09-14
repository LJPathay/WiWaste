<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
        {
            Schema::create('data_subject_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('business_id')->constrained()->onDelete('cascade');
                $table->enum('request_type', ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection']);
                $table->string('subject_identifier', 255); // email or user_id
                $table->enum('status', ['pending', 'in_progress', 'completed', 'rejected'])->default('pending');
                $table->timestamp('requested_at')->useCurrent();
                $table->timestamp('completed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_subject_requests');
    }
};