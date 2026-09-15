<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Vendor_Returns', function (Blueprint $table) {
            $table->id('vendor_return_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained('Supplier', 'supplier_id')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('User', 'User_id')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('User', 'User_id')->onDelete('set null');
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

        Schema::create('Vendor_Return_Items', function (Blueprint $table) {
            $table->id('vendor_return_item_id');
            $table->foreignId('vendor_return_id')->constrained('Vendor_Returns', 'vendor_return_id')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('Product', 'product_id')->onDelete('cascade');
            $table->foreignId('batch_id')->nullable()->constrained('FEFO_Batch', 'batch_id')->onDelete('set null');
            $table->integer('quantity');
            $table->decimal('unit_cost', 12, 2);
            $table->decimal('total_credit', 12, 2);
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Vendor_Return_Items');
        Schema::dropIfExists('Vendor_Returns');
    }
};