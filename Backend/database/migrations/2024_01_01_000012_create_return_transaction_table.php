<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Return_Transaction', function (Blueprint $table) {
            $table->integer('return_id')->autoIncrement();
            $table->integer('sale_item_id');
            $table->integer('user_id');
            $table->integer('quantity_returned');
            $table->string('reason', 255)->nullable();
            $table->decimal('refund_amount', 10, 2);
            $table->dateTime('return_date');
            
            $table->foreign('sale_item_id')->references('sales_item_id')->on('Sales_Item');
            $table->foreign('user_id')->references('User_id')->on('User');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Return_Transaction');
    }
};
