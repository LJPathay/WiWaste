<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->index('transaction_date');
        });

        Schema::table('Wastage_Record', function (Blueprint $table) {
            $table->index('date_recorded');
            $table->index('product_id');
        });

        Schema::table('Return_Transaction', function (Blueprint $table) {
            $table->index('return_date');
        });

        Schema::table('Stock_Movement', function (Blueprint $table) {
            $table->index('movement_date');
            $table->index('product_id');
        });

        Schema::table('Product', function (Blueprint $table) {
            $table->index('product_name');
        });
    }

    public function down(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->dropIndex(['transaction_date']);
        });

        Schema::table('Wastage_Record', function (Blueprint $table) {
            $table->dropIndex(['date_recorded']);
            $table->dropIndex(['product_id']);
        });

        Schema::table('Return_Transaction', function (Blueprint $table) {
            $table->dropIndex(['return_date']);
        });

        Schema::table('Stock_Movement', function (Blueprint $table) {
            $table->dropIndex(['movement_date']);
            $table->dropIndex(['product_id']);
        });

        Schema::table('Product', function (Blueprint $table) {
            $table->dropIndex(['product_name']);
        });
    }
};
