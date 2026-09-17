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

            $this->addMissingColumns($table, [
                'witnessed_at' => fn (Blueprint $t) => $t->timestamp('witnessed_at')->nullable(),
                'witness_notes' => fn (Blueprint $t) => $t->text('witness_notes')->nullable(),
                'disposal_method' => fn (Blueprint $t) => $t->string('disposal_method')->nullable(),
                'disposal_location' => fn (Blueprint $t) => $t->string('disposal_location')->nullable(),
                'requires_witness' => fn (Blueprint $t) => $t->boolean('requires_witness')->default(false),
                'witness_verified' => fn (Blueprint $t) => $t->boolean('witness_verified')->default(false),
            ]);
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

    protected function addMissingColumns(Blueprint $table, array $columns): void
    {
        foreach ($columns as $column => $definition) {
            if (!Schema::hasColumn('Wastage_Record', $column)) {
                $definition($table);
            }
        }
    }
};
