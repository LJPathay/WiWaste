<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Inventory_Recommendation', function (Blueprint $table) {
            $table->integer('recommendation_id')->autoIncrement();
            $table->integer('product_id');
            $table->integer('current_stock');
            $table->integer('recommended_stock');
            $table->enum('recommendation_type', ['Restock', 'Reduce Stock', 'Maintain']);
            $table->decimal('confidence_score', 5, 2);
            
            $table->foreign('product_id')->references('product_id')->on('Product');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Inventory_Recommendation');
    }
};
