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
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('business_type', ['food_retail', 'minimart', 'restaurant', 'pharmacy', 'hybrid']);
            $table->json('capabilities')->default('{"food_safety": true, "pharmacy_rx": false, "controlled_substances": false, "prescription_handling": false}');
            $table->string('dpo_name')->nullable();
            $table->string('dpo_email')->nullable();
            $table->string('dpo_phone')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};