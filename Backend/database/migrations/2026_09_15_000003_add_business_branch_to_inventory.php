<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Inventory', function (Blueprint $table) {
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade')->after('product_id');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade')->after('business_id');
        });
    }

    public function down(): void
    {
        Schema::table('Inventory', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['business_id', 'branch_id']);
        });
    }
};