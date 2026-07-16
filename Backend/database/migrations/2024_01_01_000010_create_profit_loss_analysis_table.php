<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Profit_Loss_Analysis', function (Blueprint $table) {
            $table->integer('analysis_id')->autoIncrement();
            $table->integer('product_id');
            $table->decimal('total_sales', 10, 2);
            $table->decimal('total_wastage_loss', 10, 2);
            $table->enum('risk_level', ['Low', 'Medium', 'High']);
            $table->decimal('predicted_profit_leakage', 10, 2);
            $table->dateTime('analysis_date');
            
            $table->foreign('product_id')->references('product_id')->on('Product');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Profit_Loss_Analysis');
    }
};
