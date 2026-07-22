<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Sales_Item', function (Blueprint $table) {
            $table->decimal('original_price', 10, 2)->nullable()->after('unit_price');
            $table->string('override_reason', 255)->nullable()->after('subtotal');
        });

        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->decimal('global_discount_pct', 5, 2)->default(0)->after('change_due');
            $table->string('senior_pwd_name', 100)->nullable()->after('global_discount_pct');
            $table->string('senior_pwd_id', 50)->nullable()->after('senior_pwd_name');
        });
    }

    public function down(): void
    {
        Schema::table('Sales_Item', function (Blueprint $table) {
            $table->dropColumn('original_price');
            $table->dropColumn('override_reason');
        });

        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->dropColumn('global_discount_pct');
            $table->dropColumn('senior_pwd_name');
            $table->dropColumn('senior_pwd_id');
        });
    }
};
