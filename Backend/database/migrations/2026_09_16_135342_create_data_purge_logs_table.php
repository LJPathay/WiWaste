<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_purge_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->foreignId('policy_id')->nullable()->constrained('data_retention_policies', 'policy_id')->onDelete('set null');
            $table->string('entity_type', 100);
            $table->string('entity_table', 100);
            $table->bigInteger('records_purged')->default(0);
            $table->bigInteger('records_anonymized')->default(0);
            $table->bigInteger('records_archived')->default(0);
            $table->dateTime('cutoff_date'); // data older than this was purged
            $table->dateTime('purged_at');
            $table->text('criteria_json')->nullable(); // what criteria was used
            $table->enum('action_taken', ['deleted', 'anonymized', 'archived', 'partial']);
            $table->text('details_json')->nullable(); // details of what was purged
            $table->string('initiated_by', 100); // 'system', 'scheduled', 'manual', 'admin_user_id'
            $table->string('status', 20)->default('completed'); // completed, failed, partial
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'entity_type']);
            $table->index(['purged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_purge_logs');
    }
};
