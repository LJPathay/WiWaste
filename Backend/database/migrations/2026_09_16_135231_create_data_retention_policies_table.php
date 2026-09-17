<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_retention_policies', function (Blueprint $table) {
            $table->id('policy_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->string('entity_type', 100); // e.g., 'sales_transactions', 'audit_logs', 'customer_pii', 'wastage_records'
            $table->string('entity_column')->nullable(); // specific column if applicable
            $table->integer('retention_days');
            $table->string('retention_unit', 20)->default('days'); // days, months, years
            $table->string('trigger_event', 50)->default('created_at'); // when retention period starts
            $table->string('action', 20)->default('delete'); // delete, anonymize, archive
            $table->text('conditions_json')->nullable(); // JSON conditions for selective retention
            $table->boolean('is_active')->default(true);
            $table->boolean('notify_before_purge')->default(true);
            $table->integer('notify_days_before')->default(30);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'entity_type']);
            $table->unique(['business_id', 'entity_type', 'trigger_event'], 'unique_policy');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_retention_policies');
    }
};
