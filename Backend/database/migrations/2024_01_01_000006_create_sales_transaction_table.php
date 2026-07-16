<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Sales_Transaction', function (Blueprint $table) {
            $table->integer('transaction_id')->autoIncrement();
            $table->integer('user_id');
            $table->decimal('total_amount', 10, 2);
            $table->dateTime('transaction_date');
            $table->enum('payment_method', ['Cash', 'E-wallet', 'Credit Card', 'Debit Card']);
            $table->decimal('amount_tendered', 10, 2)->nullable();
            $table->decimal('change_due', 10, 2)->nullable();
            $table->enum('status', ['Completed', 'Voided', 'Refunded']);
            
            $table->foreign('user_id')->references('User_id')->on('Users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Sales_Transaction');
    }
};
