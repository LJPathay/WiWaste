<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing role values to canonical values
        DB::table('User')
            ->where('role', 'Business Owner')
            ->update(['role' => 'Owner']);
        
        DB::table('User')
            ->where('role', 'Admin')
            ->update(['role' => 'Owner']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to old values
        DB::table('User')
            ->where('role', 'Owner')
            ->update(['role' => 'Business Owner']);
    }
};