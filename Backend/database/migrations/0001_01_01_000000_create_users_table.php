<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('User', function (Blueprint $table) {
            $table->integer('User_id')->autoIncrement();
            $table->string('Full_name', 100);
            $table->string('username', 50)->unique();
            $table->string('password', 100);
            $table->string('email', 100)->unique()->nullable();
            $table->enum('role', ['Admin', 'Inventory', 'Business Owner']);
            $table->enum('status', ['Active', 'Inactive']);
            $table->dateTime('Created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('User');
    }
};
