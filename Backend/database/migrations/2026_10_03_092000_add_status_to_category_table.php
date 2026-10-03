<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets categories be archived instead of deleted.
 *
 * QA requires records to be archived rather than destroyed. `DELETE /categories/{id}`
 * used to remove the row outright, taking the category out of existence and orphaning
 * any product still pointing at it. Products already archive by flipping `status`
 * between Active and Discontinued; this gives categories the same treatment.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Category', function (Blueprint $table) {
            $table->enum('status', ['Active', 'Archived'])
                ->default('Active')
                ->after('Category_name');
        });
    }

    public function down(): void
    {
        Schema::table('Category', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
