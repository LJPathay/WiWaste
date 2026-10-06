<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * wastage_flags.business_id / branch_id were created NOT NULL, but
 * User.business_id is nullable and registration never sets it. The controller
 * only copies those onto the flag when the acting user has them, so any cashier
 * who had not yet been assigned to a business hit a 500 on
 * POST /wastage-flags ("Field 'business_id' doesn't have a default value").
 *
 * Every sibling table — Wastage_Record, FEFO_Batch, Inventory — already treats
 * these as nullable scoping columns, so this aligns wastage_flags with them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wastage_flags', function (Blueprint $table) {
            $table->unsignedBigInteger('business_id')->nullable()->change();
            $table->unsignedBigInteger('branch_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('wastage_flags', function (Blueprint $table) {
            // Rows left unassigned by up() have to be resolved before the
            // columns can go back to NOT NULL. They can no longer be flagged.
            DB::table('wastage_flags')
                ->whereNull('business_id')
                ->orWhereNull('branch_id')
                ->delete();

            $table->unsignedBigInteger('business_id')->nullable(false)->change();
            $table->unsignedBigInteger('branch_id')->nullable(false)->change();
        });
    }
};
