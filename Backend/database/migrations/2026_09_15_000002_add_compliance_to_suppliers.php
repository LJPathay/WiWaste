<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier', function (Blueprint $table) {
            if (!Schema::hasColumn('supplier', 'business_id')) {
                $table->foreignId('business_id')->nullable()->constrained('businesses')->onDelete('cascade')->after('address');
            }
            if (!Schema::hasColumn('supplier', 'fda_lto_number')) {
                $table->string('fda_lto_number', 50)->nullable()->after('business_id');
            }
            if (!Schema::hasColumn('supplier', 'fda_lto_expiry')) {
                $table->date('fda_lto_expiry')->nullable()->after('fda_lto_number');
            }
            if (!Schema::hasColumn('supplier', 'fda_cpr_number')) {
                $table->string('fda_cpr_number', 50)->nullable()->after('fda_lto_expiry');
            }
            if (!Schema::hasColumn('supplier', 'fda_cpr_expiry')) {
                $table->date('fda_cpr_expiry')->nullable()->after('fda_cpr_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('supplier', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('supplier', 'business_id')) $columns[] = 'business_id';
            if (Schema::hasColumn('supplier', 'fda_lto_number')) $columns[] = 'fda_lto_number';
            if (Schema::hasColumn('supplier', 'fda_lto_expiry')) $columns[] = 'fda_lto_expiry';
            if (Schema::hasColumn('supplier', 'fda_cpr_number')) $columns[] = 'fda_cpr_number';
            if (Schema::hasColumn('supplier', 'fda_cpr_expiry')) $columns[] = 'fda_cpr_expiry';
            if (!empty($columns)) {
                $table->dropForeign(['business_id']);
                $table->dropColumn($columns);
            }
        });
    }
};