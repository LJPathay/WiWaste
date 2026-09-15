<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_receiving', function (Blueprint $table) {
            $table->id('receiving_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->integer('supplier_id');
            $table->foreign('supplier_id')->references('supplier_id')->on('supplier')->onDelete('cascade');
            $table->integer('received_by');
            $table->foreign('received_by')->references('User_id')->on('user')->onDelete('cascade');
            $table->integer('verified_by')->nullable();
            $table->foreign('verified_by')->references('User_id')->on('user')->onDelete('set null');
            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('verified_at')->nullable();
            $table->decimal('temperature_at_receipt', 5, 2)->nullable();
            $table->boolean('condition_check_passed')->default(true);
            $table->boolean('sanitation_check_passed')->default(true);
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'received', 'verified', 'rejected', 'partial'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_receiving');
    }
};