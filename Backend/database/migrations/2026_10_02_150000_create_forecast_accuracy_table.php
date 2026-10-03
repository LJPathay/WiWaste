<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Backs App\Models\ForecastAccuracy (ML forecast accuracy tracking).
     * The model and controller existed with no migration, so every
     * /api/ml/accuracy endpoint 500'd on a missing table.
     */
    public function up(): void
    {
        Schema::create('forecast_accuracy', function (Blueprint $table) {
            $table->id();
            $table->integer('product_id');
            $table->date('forecast_date');
            $table->double('predicted_value');
            $table->double('actual_value')->nullable();
            $table->double('mape')->nullable();
            $table->string('model_version', 50)->nullable();
            $table->dateTime('recorded_at')->nullable();

            $table->index(['product_id', 'forecast_date'], 'fc_acc_product_date_idx');
            $table->foreign('product_id')->references('product_id')->on('Product')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forecast_accuracy');
    }
};