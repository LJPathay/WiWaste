<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Stock_Movement', function (Blueprint $table) {
            $table->integer('movement_id')->autoIncrement();
            $table->integer('product_id');
            $table->integer('user_id');
            $table->enum('movement_type', ['Stock In', 'Stock Out']);
            $table->integer('quantity');
            $table->text('remarks')->nullable();
            $table->dateTime('movement_date');
            $table->integer('sale_item_id')->nullable();
            $table->integer('wastage_id')->nullable();
            
            $table->foreign('product_id')->references('product_id')->on('Product');
            $table->foreign('user_id')->references('User_id')->on('User');
            $table->foreign('sale_item_id')->references('sales_item_id')->on('Sales_Item')->nullOnDelete();
            $table->foreign('wastage_id')->references('wastage_id')->on('Wastage_Record')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Stock_Movement');
    }
};
