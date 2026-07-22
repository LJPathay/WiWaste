<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Sales_Item', function (Blueprint $table) {
            $table->integer('sales_item_id')->autoIncrement();
            $table->integer('transaction_id');
            $table->integer('product_id');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            
            $table->foreign('transaction_id')->references('transaction_id')->on('Sales_Transaction');
            $table->foreign('product_id')->references('product_id')->on('Product');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Sales_Item');
    }
};
