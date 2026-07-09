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
        Schema::create('Inventory', function (Blueprint $table) {
            $table->unsignedInteger('inventory_id')->autoIncrement()->primary();
            $table->unsignedInteger('product_id')->unique();
            $table->integer('current_stock');
            $table->enum('stock_status', ['Normal', 'Low Stock', 'Overstock']);
            $table->dateTime('last_updated');
            
            $table->foreign('product_id')->references('product_id')->on('Products');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Inventory');
    }
};
