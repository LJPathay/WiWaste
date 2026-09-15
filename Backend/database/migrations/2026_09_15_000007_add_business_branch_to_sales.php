<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_transaction', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_transaction', 'business_id')) {
                $table->foreignId('business_id')->nullable()->constrained('businesses')->onDelete('cascade')->after('user_id');
            }
            if (!Schema::hasColumn('sales_transaction', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade')->after('business_id');
            }
            if (!Schema::hasColumn('sales_transaction', 'customer_name')) {
                $table->string('customer_name', 255)->nullable()->after('branch_id');
            }
            if (!Schema::hasColumn('sales_transaction', 'customer_phone')) {
                $table->string('customer_phone', 20)->nullable()->after('customer_name');
            }
            if (!Schema::hasColumn('sales_transaction', 'customer_email')) {
                $table->string('customer_email', 255)->nullable()->after('customer_phone');
            }
            if (!Schema::hasColumn('sales_transaction', 'senior_pwd_id')) {
                $table->string('senior_pwd_id', 50)->nullable()->after('customer_email');
            }
            if (!Schema::hasColumn('sales_transaction', 'senior_pwd_type')) {
                $table->enum('senior_pwd_type', ['senior', 'pwd', 'none'])->default('none')->after('senior_pwd_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales_transaction', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('sales_transaction', 'business_id')) $columns[] = 'business_id';
            if (Schema::hasColumn('sales_transaction', 'branch_id')) $columns[] = 'branch_id';
            if (Schema::hasColumn('sales_transaction', 'customer_name')) $columns[] = 'customer_name';
            if (Schema::hasColumn('sales_transaction', 'customer_phone')) $columns[] = 'customer_phone';
            if (Schema::hasColumn('sales_transaction', 'customer_email')) $columns[] = 'customer_email';
            if (Schema::hasColumn('sales_transaction', 'senior_pwd_id')) $columns[] = 'senior_pwd_id';
            if (Schema::hasColumn('sales_transaction', 'senior_pwd_type')) $columns[] = 'senior_pwd_type';
            if (!empty($columns)) {
                $table->dropForeign(['business_id']);
                $table->dropForeign(['branch_id']);
                $table->dropColumn($columns);
            }
        });
    }
};