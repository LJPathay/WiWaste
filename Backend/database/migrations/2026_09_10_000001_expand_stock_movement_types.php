<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `Stock_Movement` MODIFY COLUMN `movement_type` ENUM('Stock In', 'Stock Out', 'Sale', 'Wastage', 'Return', 'Adjustment', 'Damaged', 'Expired') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `Stock_Movement` MODIFY COLUMN `movement_type` ENUM('Stock In', 'Stock Out') NOT NULL");
    }
};
