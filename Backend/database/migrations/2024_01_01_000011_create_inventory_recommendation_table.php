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
        Schema::create('Inventory_Recommendations', function (Blueprint $table) {
            $table->unsignedBigInteger('recommendation_id')->autoIncrement()->primary();
            $table->unsignedBigInteger('product_id');
            $table->integer('current_stock');
            $table->integer('recommended_stock');
            $table->enum('recommendation_type', ['Restock', 'Reduce Stock', 'Maintain']);
            $table->decimal('confidence_score', 5, 2);
            $table->dateTime('generated_date');
            
            $table->foreign('product_id')->references('product_id')->on('Products');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Inventory_Recommendations');
    }
};
