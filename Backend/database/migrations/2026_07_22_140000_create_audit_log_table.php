<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('Audit_Log', function (Blueprint $table) {
            $table->integer('log_id')->autoIncrement();
            $table->integer('user_id')->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 100);
            $table->integer('entity_id')->nullable();
            $table->text('old_values')->nullable();
            $table->text('new_values')->nullable();
            $table->dateTime('created_at');

            $table->foreign('user_id')->references('User_id')->on('User')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Audit_Log');
    }
};
