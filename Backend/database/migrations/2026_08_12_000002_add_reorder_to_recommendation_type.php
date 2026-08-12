<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE Inventory_Recommendation MODIFY recommendation_type ENUM('Restock', 'Reduce Stock', 'Maintain', 'Reorder') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE Inventory_Recommendation MODIFY recommendation_type ENUM('Restock', 'Reduce Stock', 'Maintain') NOT NULL");
    }
};
