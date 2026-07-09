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
        Schema::create('Wastage_Records', function (Blueprint $table) {
            $table->unsignedInteger('wastage_id')->autoIncrement()->primary();
            $table->unsignedInteger('product_id');
            $table->unsignedInteger('user_id');
            $table->enum('wastage_type', ['Expired', 'Damaged', 'Spoiled', 'Lost']);
            $table->integer('quantity');
            $table->decimal('estimated_loss', 10, 2);
            $table->dateTime('date_recorded');
            
            $table->foreign('product_id')->references('product_id')->on('Products');
            $table->foreign('user_id')->references('User_id')->on('Users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Wastage_Records');
    }
};
