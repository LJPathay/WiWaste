<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('FEFO_Batch', function (Blueprint $table) {
            $table->integer('batch_id')->autoIncrement();
            $table->integer('product_id');
            $table->string('batch_number', 100)->nullable();
            $table->integer('quantity');
            $table->date('expiry_date');
            $table->enum('status', ['active', 'flagged', 'cleared'])->default('active');
            $table->text('directive_notes')->nullable();
            $table->integer('created_by')->nullable();
            $table->dateTime('created_at');

            $table->foreign('product_id')->references('product_id')->on('Product');
            $table->foreign('created_by')->references('User_id')->on('User')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('FEFO_Batch');
    }
};