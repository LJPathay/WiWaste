<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('Stock_Movement', function (Blueprint $table) {
            $table->index(['product_id', 'movement_date'], 'idx_movement_product_date');
        });

        Schema::connection('mysql')->table('Sales_Transaction', function (Blueprint $table) {
            $table->index(['business_id', 'branch_id', 'transaction_date'], 'idx_sales_biz_branch_date');
        });

        Schema::connection('mysql')->table('Inventory', function (Blueprint $table) {
            $table->index(['business_id', 'branch_id', 'product_id'], 'idx_inventory_biz_branch_product');
        });

        Schema::connection('mysql')->table('FEFO_Batch', function (Blueprint $table) {
            $table->index(['product_id', 'status', 'expiry_date'], 'idx_fefo_product_status_expiry');
        });

        Schema::connection('mysql')->table('Audit_Log', function (Blueprint $table) {
            $table->index('created_at', 'idx_auditlog_created');
        });

        Schema::connection('mysql')->table('User', function (Blueprint $table) {
            $table->index('username', 'idx_user_username');
        });

        Schema::connection('mysql')->table('Stock_Receiving', function (Blueprint $table) {
            $table->index(['business_id', 'branch_id'], 'idx_stock_receiving_biz_branch');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('Stock_Movement', function (Blueprint $table) {
            $table->dropIndex('idx_movement_product_date');
        });

        Schema::connection('mysql')->table('Sales_Transaction', function (Blueprint $table) {
            $table->dropIndex('idx_sales_biz_branch_date');
        });

        Schema::connection('mysql')->table('Inventory', function (Blueprint $table) {
            $table->dropIndex('idx_inventory_biz_branch_product');
        });

        Schema::connection('mysql')->table('FEFO_Batch', function (Blueprint $table) {
            $table->dropIndex('idx_fefo_product_status_expiry');
        });

        Schema::connection('mysql')->table('Audit_Log', function (Blueprint $table) {
            $table->dropIndex('idx_auditlog_created');
        });

        Schema::connection('mysql')->table('User', function (Blueprint $table) {
            $table->dropIndex('idx_user_username');
        });

        Schema::connection('mysql')->table('Stock_Receiving', function (Blueprint $table) {
            $table->dropIndex('idx_stock_receiving_biz_branch');
        });
    }
};
