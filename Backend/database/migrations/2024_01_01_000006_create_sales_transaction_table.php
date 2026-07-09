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
        Schema::create('Sales_Transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('transaction_id')->autoIncrement()->primary();
            $table->unsignedBigInteger('user_id');
            $table->decimal('total_amount', 10, 2);
            $table->dateTime('transaction_date');
            
            $table->foreign('user_id')->references('User_id')->on('Users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Sales_Transactions');
    }
};
