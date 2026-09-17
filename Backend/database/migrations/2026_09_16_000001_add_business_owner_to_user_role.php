<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user', function (Blueprint $table) {
            $table->enum('role', ['Owner', 'Inventory', 'Cashier', 'Pharmacist', 'Business Owner'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('user', function (Blueprint $table) {
            $table->enum('role', ['Owner', 'Inventory', 'Cashier', 'Pharmacist'])->change();
        });
    }
};
