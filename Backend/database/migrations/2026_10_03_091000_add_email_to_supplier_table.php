<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the supplier email address QA requires on the supplier form.
 *
 * The Add/Edit Supplier dialog asks for a supplier name, contact person, phone number,
 * email address and address, but the `Supplier` table only ever had the first four minus
 * the email, so the value could not be captured or stored.
 *
 * The column is nullable so existing suppliers keep working; CreateSupplierRequest and
 * UpdateSupplierRequest enforce "required" for anything written from now on.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Supplier', function (Blueprint $table) {
            $table->string('email', 150)->nullable()->after('contact_number');
        });
    }

    public function down(): void
    {
        Schema::table('Supplier', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
