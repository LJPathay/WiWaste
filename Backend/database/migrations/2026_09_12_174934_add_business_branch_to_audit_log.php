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
        Schema::table('Audit_Log', function (Blueprint $table) {
            $table->foreignId('business_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('cascade');
            
            // Add foreign key for user_id if not already present (it should be from original migration)
            if (!Schema::hasColumn('Audit_Log', 'user_id')) {
                $table->foreignId('user_id')->constrained('User', 'User_id')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('Audit_Log', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn('business_id');
            $table->dropColumn('branch_id');
        });
    }
};