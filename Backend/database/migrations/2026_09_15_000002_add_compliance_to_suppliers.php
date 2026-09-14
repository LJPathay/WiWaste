<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Supplier', function (Blueprint $table) {
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade')->after('address');
            $table->string('fda_lto_number', 50)->nullable()->after('business_id');
            $table->date('fda_lto_expiry')->nullable()->after('fda_lto_number');
            $table->string('fda_cpr_number', 50)->nullable()->after('fda_lto_expiry');
            $table->date('fda_cpr_expiry')->nullable()->after('fda_cpr_number');
        });
    }

    public function down(): void
    {
        Schema::table('Supplier', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropColumn([
                'business_id',
                'fda_lto_number',
                'fda_lto_expiry',
                'fda_cpr_number',
                'fda_cpr_expiry',
            ]);
        });
    }
};