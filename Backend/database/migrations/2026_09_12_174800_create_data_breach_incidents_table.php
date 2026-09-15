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
        Schema::create('data_breach_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->timestamp('detected_at')->useCurrent();
            $table->text('description');
            $table->text('personal_data_affected');
            $table->enum('risk_assessment', ['low', 'medium', 'high', 'critical']);
            $table->boolean('npc_notification_required')->default(false);
            $table->timestamp('npc_notified_at')->nullable();
            $table->timestamp('subjects_notified_at')->nullable();
            $table->enum('status', ['open', 'investigating', 'contained', 'resolved'])->default('open');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_breach_incidents');
    }
};