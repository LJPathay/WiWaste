<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Product', function (Blueprint $table) {
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade')->after('supplier_id');
            $table->enum('product_classification', ['food', 'drug', 'cosmetic', 'device', 'general'])->default('general')->after('business_id');
            $table->decimal('required_temp_min', 5, 2)->nullable()->after('product_classification');
            $table->decimal('required_temp_max', 5, 2)->nullable()->after('required_temp_min');
            $table->enum('storage_requirement', ['refrigerated', 'frozen', 'controlled_room', 'ambient', 'custom'])->default('ambient')->after('required_temp_max');
            $table->boolean('is_rx_only')->default(false)->after('storage_requirement');
            $table->string('ddb_schedule', 20)->nullable()->after('is_rx_only');
        });
    }

    public function down(): void
    {
        Schema::table('Product', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropColumn([
                'business_id',
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