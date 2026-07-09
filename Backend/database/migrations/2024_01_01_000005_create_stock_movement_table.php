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
        Schema::create('Stock_Movements', function (Blueprint $table) {
            $table->unsignedBigInteger('movement_id')->autoIncrement()->primary();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('movement_type', ['Stock In', 'Stock Out']);
            $table->integer('quantity');
            $table->text('remarks')->nullable();
            $table->dateTime('movement_date');
            
            $table->foreign('product_id')->references('product_id')->on('Products');
            $table->foreign('user_id')->references('User_id')->on('Users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Stock_Movements');
    }
};
