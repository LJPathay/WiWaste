<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            if (!Schema::hasColumn('Sales_Transaction', 'payment_method')) {
                return;
            }

            $table->string('payment_method', 50)->change();
            $table->string('status', 20)->change();
            $table->string('payment_reference', 50)->nullable()->after('payment_method');
            $table->string('payment_status', 20)->nullable()->after('payment_reference');
            $table->string('paymongo_intent_id', 255)->nullable()->after('payment_status');
            $table->text('paymongo_checkout_url')->nullable()->after('paymongo_intent_id');
        });
    }

    public function down(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->enum('payment_method', ['Cash', 'E-wallet', 'Credit Card', 'Debit Card'])->change();
            $table->enum('status', ['Completed', 'Voided', 'Refunded'])->change();
            $table->dropColumn(['payment_reference', 'payment_status', 'paymongo_intent_id', 'paymongo_checkout_url']);
        });
    }
};
