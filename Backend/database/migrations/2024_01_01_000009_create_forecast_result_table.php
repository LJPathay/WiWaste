<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Forecast_Result', function (Blueprint $table) {
            $table->integer('forecast_id')->autoIncrement();
            $table->integer('product_id');
            $table->string('forecast_period', 50);
            $table->integer('predicted_demand');
            $table->enum('overstock_risk', ['Low', 'Medium', 'High']);
            $table->dateTime('generated_date');
            
            $table->foreign('product_id')->references('product_id')->on('Product');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Forecast_Result');
    }
};
