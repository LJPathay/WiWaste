<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fefo_batch', function (Blueprint $table) {
            if (!Schema::hasColumn('fefo_batch', 'business_id')) {
                $table->foreignId('business_id')->nullable()->constrained('businesses')->onDelete('cascade')->after('product_id');
            }
            if (!Schema::hasColumn('fefo_batch', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade')->after('business_id');
            }
            if (!Schema::hasColumn('fefo_batch', 'received_date')) {
                $table->date('received_date')->nullable()->after('branch_id');
            }
            if (!Schema::hasColumn('fefo_batch', 'received_temperature')) {
                $table->decimal('received_temperature', 5, 2)->nullable()->after('received_date');
            }
            if (!Schema::hasColumn('fefo_batch', 'supplier_batch_number')) {
                $table->string('supplier_batch_number', 100)->nullable()->after('received_temperature');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fefo_batch', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('fefo_batch', 'business_id')) $columns[] = 'business_id';
            if (Schema::hasColumn('fefo_batch', 'branch_id')) $columns[] = 'branch_id';
            if (Schema::hasColumn('fefo_batch', 'received_date')) $columns[] = 'received_date';
            if (Schema::hasColumn('fefo_batch', 'received_temperature')) $columns[] = 'received_temperature';
            if (Schema::hasColumn('fefo_batch', 'supplier_batch_number')) $columns[] = 'supplier_batch_number';
            if (!empty($columns)) {
                $table->dropForeign(['business_id']);
                $table->dropForeign(['branch_id']);
                $table->dropColumn($columns);
            }
        });
    }
};