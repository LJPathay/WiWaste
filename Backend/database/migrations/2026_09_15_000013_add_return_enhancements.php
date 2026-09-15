<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_transaction', function (Blueprint $table) {
            if (!Schema::hasColumn('return_transaction', 'business_id')) {
                $table->foreignId('business_id')->nullable()->constrained('businesses')->onDelete('cascade')->after('return_date');
            }
            if (!Schema::hasColumn('return_transaction', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade')->after('business_id');
            }
            if (!Schema::hasColumn('return_transaction', 'return_reason_code')) {
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
            }
            if (!Schema::hasColumn('return_transaction', 'evidence_notes')) {
                $table->text('evidence_notes')->nullable()->after('return_reason_code');
            }
            if (!Schema::hasColumn('return_transaction', 'evidence_photos')) {
                $table->json('evidence_photos')->nullable()->after('evidence_notes');
            }
            if (!Schema::hasColumn('return_transaction', 'approval_status')) {
                $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending')->after('evidence_photos');
            }
            if (!Schema::hasColumn('return_transaction', 'approved_by')) {
                $table->integer('approved_by')->nullable();
                $table->foreign('approved_by')->references('User_id')->on('user')->onDelete('set null')->after('approval_status');
            }
            if (!Schema::hasColumn('return_transaction', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by');
            }
            if (!Schema::hasColumn('return_transaction', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('approved_at');
            }
            if (!Schema::hasColumn('return_transaction', 'is_within_7_days')) {
                $table->boolean('is_within_7_days')->default(true)->after('rejection_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('return_transaction', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('return_transaction', 'business_id')) $columns[] = 'business_id';
            if (Schema::hasColumn('return_transaction', 'branch_id')) $columns[] = 'branch_id';
            if (Schema::hasColumn('return_transaction', 'return_reason_code')) $columns[] = 'return_reason_code';
            if (Schema::hasColumn('return_transaction', 'evidence_notes')) $columns[] = 'evidence_notes';
            if (Schema::hasColumn('return_transaction', 'evidence_photos')) $columns[] = 'evidence_photos';
            if (Schema::hasColumn('return_transaction', 'approval_status')) $columns[] = 'approval_status';
            if (Schema::hasColumn('return_transaction', 'approved_by')) $columns[] = 'approved_by';
            if (Schema::hasColumn('return_transaction', 'approved_at')) $columns[] = 'approved_at';
            if (Schema::hasColumn('return_transaction', 'rejection_reason')) $columns[] = 'rejection_reason';
            if (Schema::hasColumn('return_transaction', 'is_within_7_days')) $columns[] = 'is_within_7_days';
            if (!empty($columns)) {
                $table->dropForeign(['business_id']);
                $table->dropForeign(['branch_id']);
                $table->dropForeign(['approved_by']);
                $table->dropColumn($columns);
            }
        });
    }
};