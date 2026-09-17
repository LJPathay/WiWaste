<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_receiving_items', function (Blueprint $table) {
            $table->id('receiving_item_id');
            $table->foreignId('receiving_id')->constrained('stock_receiving', 'receiving_id')->onDelete('cascade');
            $table->integer('product_id');
            $table->foreign('product_id')->references('product_id')->on('Product');
            $table->integer('batch_id')->nullable();
            $table->foreign('batch_id')->references('batch_id')->on('FEFO_Batch')->onDelete('set null');
            $table->integer('po_item_id')->nullable();
            $table->foreign('po_item_id')->references('po_item_id')->on('Purchase_Order_Item')->onDelete('set null');
            $table->integer('expected_quantity');
            $table->integer('received_quantity')->default(0);
            $table->integer('rejected_quantity')->default(0);
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->decimal('temperature_at_receipt', 5, 2)->nullable();
            $table->boolean('condition_check_passed')->default(true);
            $table->boolean('sanitation_check_passed')->default(true);
            $table->enum('status', ['pending', 'received', 'partial', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_receiving_items');
    }
};
