<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Inventory', function (Blueprint $table) {
            $table->index('stock_status');
        });

        Schema::table('Stock_Movement', function (Blueprint $table) {
            $table->index('movement_type');
        });

        Schema::table('FEFO_Batch', function (Blueprint $table) {
            $table->index('expiry_date');
            $table->index('status');
        });

        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('Product', function (Blueprint $table) {
            $table->index('barcode');
            $table->index('status');
            $table->index('category_id');
            $table->index('supplier_id');
        });

        Schema::table('Inventory_Recommendation', function (Blueprint $table) {
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('Inventory', function (Blueprint $table) {
            $table->dropIndex(['stock_status']);
        });

        Schema::table('Stock_Movement', function (Blueprint $table) {
            $table->dropIndex(['movement_type']);
        });

        Schema::table('FEFO_Batch', function (Blueprint $table) {
            $table->dropIndex(['expiry_date']);
            $table->dropIndex(['status']);
        });

        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('Product', function (Blueprint $table) {
            $table->dropIndex(['barcode']);
            $table->dropIndex(['status']);
            $table->dropIndex(['category_id']);
            $table->dropIndex(['supplier_id']);
        });

        Schema::table('Inventory_Recommendation', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });
    }
};
