<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product', function (Blueprint $table) {
            // business_id already exists, skip
            if (!Schema::hasColumn('product', 'product_classification')) {
                $table->enum('product_classification', ['food', 'drug', 'cosmetic', 'device', 'general'])->default('general')->after('business_id');
            }
            if (!Schema::hasColumn('product', 'required_temp_min')) {
                $table->decimal('required_temp_min', 5, 2)->nullable()->after('product_classification');
            }
            if (!Schema::hasColumn('product', 'required_temp_max')) {
                $table->decimal('required_temp_max', 5, 2)->nullable()->after('required_temp_min');
            }
            if (!Schema::hasColumn('product', 'storage_requirement')) {
                $table->enum('storage_requirement', ['refrigerated', 'frozen', 'controlled_room', 'ambient', 'custom'])->default('ambient')->after('required_temp_max');
            }
            if (!Schema::hasColumn('product', 'is_rx_only')) {
                $table->boolean('is_rx_only')->default(false)->after('storage_requirement');
            }
            if (!Schema::hasColumn('product', 'ddb_schedule')) {
                $table->string('ddb_schedule', 20)->nullable()->after('is_rx_only');
            }
        });
    }

    public function down(): void
    {
        Schema::table('product', function (Blueprint $table) {
            $table->dropColumn([
                'product_classification',
                'required_temp_min',
                'required_temp_max',
                'storage_requirement',
                'is_rx_only',
                'ddb_schedule',
            ]);
        });
    }
};