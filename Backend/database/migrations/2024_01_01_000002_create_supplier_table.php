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
        Schema::create('Supplier', function (Blueprint $table) {
            $table->unsignedInteger('supplier_id')->autoIncrement()->primary();
            $table->string('supplier_name', 150);
            $table->string('contact_person', 100)->nullable();
            $table->string('contact_number', 20);
            $table->string('address', 255)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Supplier');
    }
};
