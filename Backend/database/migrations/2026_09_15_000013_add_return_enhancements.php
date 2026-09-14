<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Return_Transaction', function (Blueprint $table) {
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade')->after('return_date');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade')->after('business_id');
            $table->enum('return_reason_code', [
                'defective',
                'wrong_item',
                'change_mind',
                'damaged',
                'expired',
                'missing_parts',
                'not_as_described',
                'other'
            ])->default('other')->after('branch_id');
            $table->text('evidence_notes')->nullable()->after('return_reason_code');
            $table->json('evidence_photos')->nullable()->after('evidence_notes');
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending')->after('evidence_photos');
            $table->foreignId('approved_by')->nullable()->constrained('User', 'User_id')->onDelete('set null')->after('approval_status');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
            $table->boolean('is_within_7_days')->default(true)->after('rejection_reason');
        });
    }

    public function down(): void
    {
        Schema::table('Return_Transaction', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropForeign(['branch_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'business_id',
                'branch_id',
                'return_reason_code',
                'evidence_notes',
                'evidence_photos',
                'approval_status',
                'approved_by',
                'approved_at',
                'rejection_reason',
                'is_within_7_days',
            ]);
        });
    }
};