<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->decimal('vat_amount', 12, 2)->default(0)->after('total_amount');
            $table->decimal('vatable_amount', 12, 2)->default(0)->after('vat_amount');
            $table->decimal('non_vatable_amount', 12, 2)->default(0)->after('vatable_amount');
            $table->decimal('senior_pwd_discount_amount', 12, 2)->default(0)->after('non_vatable_amount');
            $table->decimal('senior_pwd_vat_exempt_amount', 12, 2)->default(0)->after('senior_pwd_discount_amount');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('senior_pwd_vat_exempt_amount');
            $table->json('discount_breakdown')->nullable()->after('discount_amount');
        });

        Schema::table('Sales_Item', function (Blueprint $table) {
            $table->decimal('vat_amount', 12, 2)->default(0)->after('subtotal');
            $table->decimal('vatable_amount', 12, 2)->default(0)->after('vat_amount');
            $table->decimal('discount_amount', 12, 2)->default(0)->after('vatable_amount');
            $table->decimal('discount_pct', 5, 2)->nullable()->after('discount_amount');
            $table->boolean('is_senior_pwd_exempt')->default(false)->after('discount_pct');
        });
    }

    public function down(): void
    {
        Schema::table('Sales_Transaction', function (Blueprint $table) {
            $table->dropColumn([
                'vat_amount',
                'vatable_amount',
                'non_vatable_amount',
                'senior_pwd_discount_amount',
                'senior_pwd_vat_exempt_amount',
                'discount_amount',
                'discount_breakdown',
            ]);
        });

        Schema::table('Sales_Item', function (Blueprint $table) {
            $table->dropColumn([
                'vat_amount',
                'vatable_amount',
                'discount_amount',
                'discount_pct',
                'is_senior_pwd_exempt',
            ]);
        });
    }
};