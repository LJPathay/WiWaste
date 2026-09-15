<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_returns', function (Blueprint $table) {
            $table->id('vendor_return_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->integer('supplier_id');
            $table->foreign('supplier_id')->references('supplier_id')->on('supplier')->onDelete('cascade');
            $table->integer('created_by');
            $table->foreign('created_by')->references('User_id')->on('user')->onDelete('cascade');
            $table->integer('approved_by')->nullable();
            $table->foreign('approved_by')->references('User_id')->on('user')->onDelete('set null');
            $table->string('return_number', 50)->unique();
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'shipped', 'received', 'credited', 'cancelled'])->default('draft');
            $table->enum('return_reason_code', ['overstock', 'near_expiry', 'damaged', 'wrong_shipment', 'quality_issue', 'recall', 'expired', 'other'])->default('other');
            $table->text('notes')->nullable();
            $table->decimal('total_credit_amount', 12, 2)->default(0);
            $table->date('requested_date')->nullable();
            $table->date('approved_date')->nullable();
            $table->date('shipped_date')->nullable();
            $table->date('received_date')->nullable();
            $table->date('credited_date')->nullable();
            $table->timestamps();
        });

        Schema::create('vendor_return_items', function (Blueprint $table) {
            $table->id('vendor_return_item_id');
            $table->foreignId('vendor_return_id')->constrained('vendor_returns', 'vendor_return_id')->onDelete('cascade');
            $table->integer('product_id');
            $table->foreign('product_id')->references('product_id')->on('product')->onDelete('cascade');
            $table->integer('batch_id')->nullable();
            $table->foreign('batch_id')->references('batch_id')->on('fefo_batch')->onDelete('set null');
            $table->integer('quantity');
            $table->decimal('unit_cost', 12, 2);
            $table->decimal('total_credit', 12, 2);
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_return_items');
        Schema::dropIfExists('vendor_returns');
    }
};