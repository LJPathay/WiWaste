<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The QA upgrade may already have populated these fields. Preserve both
        // existing identity data and the legacy full name during this merge.
        foreach (['first_name', 'middle_name', 'surname', 'contact_number'] as $column) {
            if (! Schema::hasColumn('User', $column)) {
                Schema::table('User', fn (Blueprint $table) => $table->string($column, $column === 'contact_number' ? 20 : 50)->nullable());
            }
        }
        if (! Schema::hasColumn('User', 'Full_name')) {
            return;
        }
        foreach (DB::table('User')->get() as $user) {
            if (! empty($user->first_name ?? $user->First_name ?? null)) {
                continue;
            }
            $parts = preg_split('/\s+/u', trim($user->Full_name), -1, PREG_SPLIT_NO_EMPTY);
            $first = array_shift($parts) ?? '';
            $surname = count($parts) ? array_pop($parts) : '';
            DB::table('User')->where('User_id', $user->User_id)->update([
                'first_name' => mb_substr($first, 0, 50),
                'middle_name' => count($parts) ? mb_substr(implode(' ', $parts), 0, 50) : null,
                'surname' => mb_substr($surname, 0, 50),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('User', function (Blueprint $table) {
            $table->string('Full_name', 100)->after('User_id');
        });

        // Reconstruct Full_name from individual fields
        $users = DB::table('User')->select('User_id', 'first_name', 'middle_name', 'surname')->get();
        foreach ($users as $user) {
            $nameParts = array_filter([$user->first_name, $user->middle_name, $user->surname]);
            DB::table('User')
                ->where('User_id', $user->User_id)
                ->update(['Full_name' => implode(' ', $nameParts)]);
        }

        Schema::table('User', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'middle_name', 'surname', 'contact_number']);
        });
    }
};
