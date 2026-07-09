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
        Schema::create('Forecast_Results', function (Blueprint $table) {
            $table->unsignedBigInteger('forecast_id')->autoIncrement()->primary();
            $table->unsignedBigInteger('product_id');
            $table->string('forecast_period', 50);
            $table->integer('predicted_demand');
            $table->enum('overstock_risk', ['Low', 'Medium', 'High']);
            $table->dateTime('generated_date');
            
            $table->foreign('product_id')->references('product_id')->on('Products');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Forecast_Results');
    }
};
