<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade')->after('user_id');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade')->after('business_id');
            $table->string('customer_name', 255)->nullable()->after('branch_id');
            $table->string('customer_phone', 20)->nullable()->after('customer_name');
            $table->string('customer_email', 255)->nullable()->after('customer_phone');
            $table->string('senior_pwd_id', 50)->nullable()->after('customer_email');
            $table->enum('senior_pwd_type', ['senior', 'pwd', 'none'])->default('none')->after('senior_pwd_id');
        });
    }

    public function down(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn([
                'business_id',
                'branch_id',
                'customer_name',
                'customer_phone',
                'customer_email',
                'senior_pwd_id',
                'senior_pwd_type',
            ]);
        });
    }
};