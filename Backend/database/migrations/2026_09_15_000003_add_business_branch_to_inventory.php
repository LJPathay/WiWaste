<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory', 'business_id')) {
                $table->foreignId('business_id')->nullable()->constrained('businesses')->onDelete('cascade')->after('product_id');
            }
            if (!Schema::hasColumn('inventory', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade')->after('business_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('inventory', 'business_id')) $columns[] = 'business_id';
            if (Schema::hasColumn('inventory', 'branch_id')) $columns[] = 'branch_id';
            if (!empty($columns)) {
                $table->dropForeign(['business_id']);
                $table->dropForeign(['branch_id']);
                $table->dropColumn($columns);
            }
        });
    }
};