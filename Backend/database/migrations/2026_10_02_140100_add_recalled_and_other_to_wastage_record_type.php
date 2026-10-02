<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Wastage_Record.wastage_type was ENUM(Expired, Damaged, Spoiled, Lost), but
 * wastage_flags.reason also allows 'recalled' and 'other'. WastageFlagController
 * confirmed a flag by writing ucfirst($flag->reason) straight into this column,
 * so confirming any flag raised with reason 'recalled' or 'other' failed with
 * "Data truncated for column 'wastage_type'".
 *
 * A recall is a distinct reportable category in pharma wastage, so it gets its
 * own enum value rather than being collapsed into 'Lost'.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `Wastage_Record` MODIFY `wastage_type` ENUM('Expired','Damaged','Spoiled','Lost','Recalled','Other') NOT NULL");
    }

    public function down(): void
    {
        // No lossy enum values here — every new value maps cleanly onto 'Lost'.
        DB::statement("UPDATE `Wastage_Record` SET `wastage_type` = 'Lost' WHERE `wastage_type` IN ('Recalled','Other')");
        DB::statement("ALTER TABLE `Wastage_Record` MODIFY `wastage_type` ENUM('Expired','Damaged','Spoiled','Lost') NOT NULL");
    }
};