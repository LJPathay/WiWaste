<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Inventory_Recommendation', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->integer('reviewed_by')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->dateTime('created_at');

            $table->foreign('reviewed_by')->references('User_id')->on('User')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('Inventory_Recommendation', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn(['status', 'reviewed_by', 'rejection_reason', 'reviewed_at', 'created_at']);
        });
    }
};