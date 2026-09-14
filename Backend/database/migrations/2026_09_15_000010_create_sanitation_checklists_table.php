<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Sanitation_Checklists', function (Blueprint $table) {
            $table->id('checklist_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('User', 'User_id')->onDelete('cascade');
            $table->date('checklist_date');
            $table->enum('frequency', ['daily', 'weekly', 'monthly'])->default('daily');
            $table->enum('area', ['receiving', 'storage', 'preparation', 'dispensing', 'waste', 'general'])->default('general');
            $table->json('checks')->comment('Array of check items with pass/fail and notes');
            $table->enum('overall_status', ['pass', 'fail', 'pending'])->default('pending');
            $table->foreignId('verified_by')->nullable()->constrained('User', 'User_id')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Sanitation_Checklists');
    }
};