<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Inventory::calcStatus() returns 'Out of Stock' when stock <= 0, but the
 * original enum only allowed (Normal, Low Stock, Overstock). Any product that
 * reached zero stock therefore failed its write with a "Data truncated for
 * column 'stock_status'" error — reachable from stock-in, stock-out, cycle
 * counts and every wastage write.
 *
 * Uses a raw ALTER rather than $table->enum()->change() so it works without
 * doctrine/dbal and so the existing index on stock_status is left untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `Inventory` MODIFY `stock_status` ENUM('Normal','Low Stock','Overstock','Out of Stock') NOT NULL");
    }

    public function down(): void
    {
        // Anything already at zero stock has to move somewhere valid first.
        DB::statement("UPDATE `Inventory` SET `stock_status` = 'Low Stock' WHERE `stock_status` = 'Out of Stock'");
        DB::statement("ALTER TABLE `Inventory` MODIFY `stock_status` ENUM('Normal','Low Stock','Overstock') NOT NULL");
    }
};