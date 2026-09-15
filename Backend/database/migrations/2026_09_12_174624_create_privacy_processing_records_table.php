<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
        {
            Schema::create('privacy_processing_records', function (Blueprint $table) {
                $table->id();
                $table->foreignId('business_id')->constrained()->onDelete('cascade');
                $table->string('data_category', 100); // 'customer_pii', 'employee_data', 'supplier_data'
                $table->string('purpose', 255); // 'order_fulfillment', 'marketing', 'compliance'
                $table->string('legal_basis', 100); // 'contract', 'legitimate_interest', 'consent', 'legal_obligation'
                $table->string('retention_period', 100); // '7_years', '3_years_after_termination'
                $table->json('recipients'); // ['payment_gateway', 'delivery_service']
                $table->text('safeguards'); // 'encryption_at_rest', 'access_control'
                $table->enum('status', ['active', 'archived'])->default('active');
                $table->timestamps();
            });
        }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('privacy_processing_records');
    }
};