<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('User', function (Blueprint $table) {
            $table->string('first_name', 50)->after('Full_name');
            $table->string('middle_name', 50)->nullable()->after('first_name');
            $table->string('surname', 50)->after('middle_name');
            $table->string('contact_number', 20)->nullable()->after('surname');
        });

        // Migrate data: split Full_name on spaces
        $users = DB::table('User')->select('User_id', 'Full_name')->get();
        foreach ($users as $user) {
            $parts = array_filter(explode(' ', trim($user->Full_name)));
            $firstName = $parts[0] ?? '';
            $surname = end($parts) ?? '';
            $middleParts = array_slice($parts, 1, -1);
            $middleName = !empty($middleParts) ? implode(' ', $middleParts) : null;

            // If only one name, it's the first name and surname is the same
            if (count($parts) <= 1) {
                $surname = $firstName;
            }

            DB::table('User')
                ->where('User_id', $user->User_id)
                ->update([
                    'first_name'     => $firstName,
                    'middle_name'    => $middleName,
                    'surname'        => $surname,
                    'contact_number' => null,
                ]);
        }

        Schema::table('User', function (Blueprint $table) {
            $table->dropColumn('Full_name');
        });
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
