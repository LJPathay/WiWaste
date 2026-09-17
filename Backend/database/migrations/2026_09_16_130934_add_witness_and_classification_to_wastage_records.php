<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('Wastage_Record', function (Blueprint $table) {
            if (!Schema::hasColumn('Wastage_Record', 'witnessed_by')) {
                $table->integer('witnessed_by')->nullable();
            } else {
                $table->integer('witnessed_by')->nullable()->change();
            }
            
            if (!Schema::hasColumn('Wastage_Record', 'witnessed_by')) {
                $table->foreign('witnessed_by')->references('User_id')->on('User')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('Wastage_Record', 'witnessed_at')) {
                $table->timestamp('witnessed_at')->nullable();
            }
            if (!Schema::hasColumn('Wastage_Record', 'witness_notes')) {
                $table->text('witness_notes')->nullable();
            }
            if (!Schema::hasColumn('Wastage_Record', 'disposal_method')) {
                $table->string('disposal_method')->nullable();
            }
            if (!Schema::hasColumn('Wastage_Record', 'disposal_location')) {
                $table->string('disposal_location')->nullable();
            }
            if (!Schema::hasColumn('Wastage_Record', 'requires_witness')) {
                $table->boolean('requires_witness')->default(false);
            }
            if (!Schema::hasColumn('Wastage_Record', 'witness_verified')) {
                $table->boolean('witness_verified')->default(false);
            }
        });
    }

    public function down(): void
    {
        Schema::table('Wastage_Record', function (Blueprint $table) {
            $table->dropForeign(['witnessed_by']);
            $table->dropColumn([
                'witnessed_by',
                'witnessed_at',
                'witness_notes',
                'disposal_method',
                'disposal_location',
                'requires_witness',
                'witness_verified',
            ]);
        });
    }
};
