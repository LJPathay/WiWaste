<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('FEFO_Batch', function (Blueprint $table) {
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade')->after('product_id');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade')->after('business_id');
            $table->date('received_date')->nullable()->after('branch_id');
            $table->decimal('received_temperature', 5, 2)->nullable()->after('received_date');
            $table->string('supplier_batch_number', 100)->nullable()->after('received_temperature');
        });
    }

    public function down(): void
    {
        Schema::table('FEFO_Batch', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn([
                'business_id',
                'branch_id',
                'received_date',
                'received_temperature',
                'supplier_batch_number',
            ]);
        });
    }
};