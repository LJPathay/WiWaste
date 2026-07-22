<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Wastage_Record', function (Blueprint $table) {
            $table->integer('wastage_id')->autoIncrement();
            $table->integer('product_id');
            $table->integer('user_id');
            $table->enum('wastage_type', ['Expired', 'Damaged', 'Spoiled', 'Lost']);
            $table->integer('quantity');
            $table->decimal('estimated_loss', 10, 2);
            $table->dateTime('date_recorded');
            
            $table->foreign('product_id')->references('product_id')->on('Product');
            $table->foreign('user_id')->references('User_id')->on('User');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Wastage_Record');
    }
};
