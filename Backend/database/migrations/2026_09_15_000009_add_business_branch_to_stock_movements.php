<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movement', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_movement', 'business_id')) {
                $table->foreignId('business_id')->nullable()->constrained('businesses')->onDelete('cascade')->after('product_id');
            }
            if (!Schema::hasColumn('stock_movement', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade')->after('business_id');
            }
            if (!Schema::hasColumn('stock_movement', 'batch_id')) {
                $table->integer('batch_id')->nullable();
                $table->foreign('batch_id')->references('batch_id')->on('fefo_batch')->onDelete('set null')->after('branch_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_movement', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('stock_movement', 'business_id')) $columns[] = 'business_id';
            if (Schema::hasColumn('stock_movement', 'branch_id')) $columns[] = 'branch_id';
            if (Schema::hasColumn('stock_movement', 'batch_id')) $columns[] = 'batch_id';
            if (!empty($columns)) {
                $table->dropForeign(['business_id']);
                $table->dropForeign(['branch_id']);
                $table->dropForeign(['batch_id']);
                $table->dropColumn($columns);
            }
        });
    }
};