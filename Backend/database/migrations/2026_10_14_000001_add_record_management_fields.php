<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('User', function (Blueprint $table) {
            // Keep existing accounts intact while adding the structured fields used for new accounts.
            $table->string('First_name', 50)->nullable();
            $table->string('Middle_name', 50)->nullable();
            $table->string('Surname', 50)->nullable();
            $table->string('contact_number', 11)->nullable();
            $table->string('address', 255)->nullable();
            $table->integer('status_changed_by')->nullable();
            $table->dateTime('status_changed_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->string('Full_name', 160)->change();
            $table->string('role', 32)->change();
            $table->string('status', 20)->default('Active')->change();
        });

        // The old Business Owner UI choice represented the cashier role.
        DB::table('User')->where('role', 'Business Owner')->update(['role' => 'Cashier']);

        DB::table('User')->orderBy('User_id')->chunkById(100, function ($users) {
            foreach ($users as $user) {
                $parts = preg_split('/\s+/u', trim($user->Full_name), -1, PREG_SPLIT_NO_EMPTY);
                $firstName = array_shift($parts) ?? '';
                $surname = count($parts) ? array_pop($parts) : null;
                DB::table('User')->where('User_id', $user->User_id)->update([
                    'First_name' => mb_substr($firstName, 0, 50),
                    'Middle_name' => count($parts) ? mb_substr(implode(' ', $parts), 0, 50) : null,
                    'Surname' => $surname === null ? null : mb_substr($surname, 0, 50),
                ]);
            }
        }, 'User_id');

        Schema::table('Supplier', fn (Blueprint $table) => $table->string('email', 100)->nullable());

        Schema::table('Category', function (Blueprint $table) {
            $table->string('status', 20)->default('Active');
            $table->dateTime('archived_at')->nullable();
            $table->integer('archived_by')->nullable();
        });

        Schema::table('Product', function (Blueprint $table) {
            $table->string('status', 20)->default('Active')->change();
            $table->dateTime('archived_at')->nullable();
            $table->integer('archived_by')->nullable();
            $table->string('archive_previous_status', 20)->nullable();
        });
    }

    public function down(): void
    {
        // An archive is a retained record; rollback restores a supported status without deleting it.
        DB::table('User')->where('status', 'Archived')->update(['status' => 'Inactive']);
        DB::table('Product')->where('status', 'Archived')->update(['status' => 'Discontinued']);
        Schema::table('User', fn (Blueprint $table) => $table->dropColumn([
            'First_name', 'Middle_name', 'Surname', 'contact_number', 'address',
            'status_changed_by', 'status_changed_at', 'archived_at',
        ]));
        Schema::table('Supplier', fn (Blueprint $table) => $table->dropColumn('email'));
        Schema::table('Category', fn (Blueprint $table) => $table->dropColumn(['status', 'archived_at', 'archived_by']));
        Schema::table('Product', fn (Blueprint $table) => $table->dropColumn(['archived_at', 'archived_by', 'archive_previous_status']));
    }
};
