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
        Schema::create('Products', function (Blueprint $table) {
            $table->unsignedInteger('product_id')->autoIncrement()->primary();
            $table->unsignedInteger('category_id');
            $table->unsignedInteger('supplier_id');
            $table->string('barcode', 50)->unique();
            $table->string('product_name', 150);
            $table->decimal('cost_price', 10, 2);
            $table->decimal('selling_price', 10, 2);
            $table->integer('reorder_level');
            $table->date('expiration_date')->nullable();
            
            $table->foreign('category_id')->references('Category_id')->on('Categories');
            $table->foreign('supplier_id')->references('supplier_id')->on('Supplier');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Products');
    }
};
