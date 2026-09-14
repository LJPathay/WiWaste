<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Recalls', function (Blueprint $table) {
            $table->id('recall_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->string('recall_number', 50)->unique();
            $table->foreignId('product_id')->constrained('Product', 'product_id')->onDelete('cascade');
            $table->foreignId('batch_id')->nullable()->constrained('FEFO_Batch', 'batch_id')->onDelete('set null');
            $table->foreignId('supplier_id')->nullable()->constrained('Supplier', 'supplier_id')->onDelete('set null');
            $table->text('reason');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['draft', 'active', 'quarantined', 'notified', 'resolved', 'closed'])->default('draft');
            $table->json('affected_batches')->nullable()->comment('List of affected batch IDs and quantities');
            $table->integer('total_quantity_affected')->default(0);
            $table->date('initiated_date')->nullable();
            $table->date('target_resolution_date')->nullable();
            $table->date('actual_resolution_date')->nullable();
            $table->foreignId('initiated_by')->constrained('User', 'User_id')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('User', 'User_id')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Recalls');
    }
};