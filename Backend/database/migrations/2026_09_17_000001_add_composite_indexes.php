<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEXES = [
        ['table' => 'Stock_Movement',    'columns' => ['product_id', 'movement_date'],                      'name' => 'idx_movement_product_date'],
        ['table' => 'Sales_Transaction', 'columns' => ['business_id', 'branch_id', 'transaction_date'],     'name' => 'idx_sales_biz_branch_date'],
        ['table' => 'Inventory',         'columns' => ['business_id', 'branch_id', 'product_id'],           'name' => 'idx_inventory_biz_branch_product'],
        ['table' => 'FEFO_Batch',        'columns' => ['product_id', 'status', 'expiry_date'],             'name' => 'idx_fefo_product_status_expiry'],
        ['table' => 'Audit_Log',         'columns' => ['created_at'],                                       'name' => 'idx_auditlog_created'],
        ['table' => 'User',              'columns' => ['username'],                                          'name' => 'idx_user_username'],
        ['table' => 'Stock_Receiving',   'columns' => ['business_id', 'branch_id'],                         'name' => 'idx_stock_receiving_biz_branch'],
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $index) {
            Schema::connection('mysql')->table($index['table'], function (Blueprint $table) use ($index) {
                $table->index($index['columns'], $index['name']);
            });
        }
    }

    public function down(): void
    {
        foreach (self::INDEXES as $index) {
            Schema::connection('mysql')->table($index['table'], function (Blueprint $table) use ($index) {
                $table->dropIndex($index['name']);
            });
        }
    }
};
