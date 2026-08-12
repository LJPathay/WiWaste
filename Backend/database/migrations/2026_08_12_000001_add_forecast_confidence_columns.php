<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Forecast_Result', function (Blueprint $table) {
            $table->double('lower_bound')->nullable()->after('predicted_demand');
            $table->double('upper_bound')->nullable()->after('lower_bound');
            $table->double('confidence')->nullable()->after('upper_bound');
        });
    }

    public function down(): void
    {
        Schema::table('Forecast_Result', function (Blueprint $table) {
            $table->dropColumn(['lower_bound', 'upper_bound', 'confidence']);
        });
    }
};
