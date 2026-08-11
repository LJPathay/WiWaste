<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('User', function (Blueprint $table) {
            $table->enum('status', ['Active', 'Inactive', 'Quarantined'])->default('Active')->change();
        });
    }

    public function down(): void
    {
        Schema::table('User', function (Blueprint $table) {
            $table->enum('status', ['Active', 'Inactive'])->default('Active')->change();
        });
    }
};
