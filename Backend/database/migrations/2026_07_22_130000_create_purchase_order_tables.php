<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Purchase_Order', function (Blueprint $table) {
            $table->integer('po_id')->autoIncrement();
            $table->integer('supplier_id');
            $table->integer('user_id');
            $table->string('po_number', 50)->unique();
            $table->enum('status', ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'])->default('Draft');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at')->nullable();

            $table->foreign('supplier_id')->references('supplier_id')->on('Supplier');
            $table->foreign('user_id')->references('User_id')->on('User');
        });

        Schema::create('Purchase_Order_Item', function (Blueprint $table) {
            $table->integer('po_item_id')->autoIncrement();
            $table->integer('po_id');
            $table->integer('product_id');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 12, 2);
            $table->integer('received_qty')->default(0);

            $table->foreign('po_id')->references('po_id')->on('Purchase_Order')->onDelete('cascade');
            $table->foreign('product_id')->references('product_id')->on('Product');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Purchase_Order_Item');
        Schema::dropIfExists('Purchase_Order');
    }
};
