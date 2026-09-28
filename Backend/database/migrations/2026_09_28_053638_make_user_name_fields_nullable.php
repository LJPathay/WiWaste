<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('User', function (Blueprint $table) {
            // Make first_name and surname nullable to support existing tests
            // middle_name is already nullable from the split migration
            $table->string('first_name', 50)->nullable()->change();
            $table->string('surname', 50)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('User', function (Blueprint $table) {
            $table->string('first_name', 50)->nullable(false)->change();
            $table->string('surname', 50)->nullable(false)->change();
        });
    }
};