<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Product', function (Blueprint $table) {
            $table->integer('product_id')->autoIncrement();
            $table->integer('category_id');
            $table->integer('supplier_id');
            $table->string('barcode', 50)->unique()->nullable();
            $table->string('product_name', 150);
            $table->decimal('cost_price', 10, 2);
            $table->decimal('selling_price', 10, 2);
            $table->integer('reorder_level');
            $table->date('expiration_date')->nullable();
            
            $table->foreign('category_id')->references('Category_id')->on('Category');
            $table->foreign('supplier_id')->references('supplier_id')->on('Supplier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Product');
    }
};
