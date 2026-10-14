<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every index this migration owns, keyed by table.
     *
     * `up()` and `down()` are both driven off this one list, so adding an index
     * cannot leave the rollback missing it (or the reverse) — the pair used to
     * read as two independent lists that had to be kept in step by hand.
     *
     * Each entry is the column list passed to `index()`/`dropIndex()`. A
     * single-column index is still a one-element array because that is the
     * shape `dropIndex()` uses to rebuild the generated index name.
     */
    private const INDEXES = [
        'Product' => [
            ['category_id'],
            ['supplier_id'],
            ['status'],
            ['barcode'],
        ],

        // Two blocks used to target `Inventory` separately; the composite set and
        // the `expiration_date` index are the same table, so they are one entry.
        'Inventory' => [
            ['product_id', 'business_id'],
            ['stock_status', 'business_id'],
            ['branch_id', 'product_id'],
            ['expiration_date'],
        ],

        'Sales_Transaction' => [
            ['business_id', 'transaction_date'],
            ['branch_id', 'transaction_date'],
            ['user_id', 'transaction_date'],
            ['status'],
        ],

        'Sales_Item' => [
            ['transaction_id', 'product_id'],
            ['product_id'],
        ],

        'Wastage_Record' => [
            ['business_id', 'date_recorded'],
            ['branch_id', 'date_recorded'],
            ['product_id'],
        ],

        'Return_Transaction' => [
            ['business_id', 'return_date'],
            ['branch_id', 'return_date'],
            ['sales_item_id'],
            ['approval_status'],
        ],

        'Stock_Movement' => [
            ['business_id', 'movement_date'],
            ['branch_id', 'movement_date'],
            ['product_id', 'movement_date'],
        ],

        'FEFO_Batch' => [
            ['product_id', 'expiry_date'],
            ['business_id', 'status'],
        ],

        'Stock_Receiving' => [
            ['business_id', 'status'],
            ['branch_id', 'status'],
        ],

        'Purchase_Order' => [
            ['business_id', 'status'],
            ['branch_id', 'status'],
            ['supplier_id', 'status'],
        ],

        'Audit_Log' => [
            ['entity_type', 'entity_id'],
            ['user_id', 'created_at'],
            ['business_id', 'created_at'],
        ],

        'Category' => [
            ['Category_name'],
        ],

        'Supplier' => [
            ['supplier_name'],
            ['business_id', 'status'],
        ],
    ];

    /**
     * Run the migrations.
     *
     * Some indexes already exist from previous migrations, so each table is
     * attempted independently and a failure is skipped rather than aborting the
     * whole run — one leftover index must not block the rest.
     */
    public function up(): void
    {
        foreach (self::INDEXES as $table => $indexes) {
            try {
                Schema::table($table, function (Blueprint $blueprint) use ($indexes) {
                    foreach ($indexes as $columns) {
                        $blueprint->index($columns);
                    }
                });
            } catch (Exception $e) {
                // Indexes may already exist
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (self::INDEXES as $table => $indexes) {
            Schema::table($table, function (Blueprint $blueprint) use ($indexes) {
                foreach ($indexes as $columns) {
                    $blueprint->dropIndex($columns);
                }
            });
        }
    }
};
