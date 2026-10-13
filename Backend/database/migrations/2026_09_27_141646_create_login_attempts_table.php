<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_attempts', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->nullable();
            $table->string('email_attempted');
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->enum('attempt_type', ['failed', 'successful']);
            $table->timestamp('locked_until')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('User_id')->on('User')->nullOnDelete();
            $table->index('email_attempted');
            $table->index('locked_until');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_attempts');
    }
};
