<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('User', function (Blueprint $table) {
            if (! Schema::hasColumn('User', 'failed_login_attempts')) {
                $table->unsignedTinyInteger('failed_login_attempts')->default(0);
            }
            if (! Schema::hasColumn('User', 'locked_until')) {
                $table->dateTime('locked_until')->nullable();
            }
        });

        if (Schema::hasTable('password_reset_otps')) {
            return;
        }
        Schema::create('password_reset_otps', function (Blueprint $table) {
            $table->integer('user_id')->primary();
            $table->string('code_hash');
            $table->dateTime('expires_at');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('created_at');
            $table->foreign('user_id')->references('User_id')->on('User')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_otps');
        Schema::table('User', function (Blueprint $table) {
            $table->dropColumn(['failed_login_attempts', 'locked_until']);
        });
    }
};
