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
        Schema::create('Sales_Items', function (Blueprint $table) {
            $table->unsignedBigInteger('sales_item_id')->autoIncrement()->primary();
            $table->unsignedBigInteger('transaction_id');
            $table->unsignedBigInteger('product_id');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            
            $table->foreign('transaction_id')->references('transaction_id')->on('Sales_Transactions');
            $table->foreign('product_id')->references('product_id')->on('Products');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Sales_Items');
    }
};
