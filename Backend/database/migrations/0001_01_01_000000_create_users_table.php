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
        Schema::create('Users', function (Blueprint $table) {
            $table->unsignedInteger('User_id')->autoIncrement()->primary();
            $table->string('Full_name', 100);
            $table->string('username', 50)->unique();
            $table->binary('password', 255);
            $table->string('email', 100)->unique();
            $table->enum('role', ['Admin', 'Inventory', 'Business Owner']);
            $table->enum('status', ['Active', 'Inactive']);
            $table->dateTime('Created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('Users');
    }
};
