<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `User` MODIFY COLUMN `status` ENUM('Active', 'Inactive', 'Quarantined') NOT NULL DEFAULT 'Active'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `User` MODIFY COLUMN `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active'");
    }
};
