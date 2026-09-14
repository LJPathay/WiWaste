<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Stock_Receiving', function (Blueprint $table) {
            $table->id('receiving_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained('Supplier', 'supplier_id')->onDelete('cascade');
            $table->foreignId('received_by')->constrained('users', 'User_id')->onDelete('cascade');
            $table->foreignId('verified_by')->nullable()->constrained('users', 'User_id')->onDelete('set null');
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
        Schema::dropIfExists('Stock_Receiving');
    }
};