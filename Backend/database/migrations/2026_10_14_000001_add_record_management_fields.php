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
            if (! Schema::hasColumn('User', 'First_name')) {
                $table->string('First_name', 50)->nullable();
            }
            if (! Schema::hasColumn('User', 'Middle_name')) {
                $table->string('Middle_name', 50)->nullable();
            }
            if (! Schema::hasColumn('User', 'Surname')) {
                $table->string('Surname', 50)->nullable();
            }
            if (! Schema::hasColumn('User', 'contact_number')) {
                $table->string('contact_number', 11)->nullable();
            }
            if (! Schema::hasColumn('User', 'address')) {
                $table->string('address', 255)->nullable();
            }
            if (! Schema::hasColumn('User', 'status_changed_by')) {
                $table->integer('status_changed_by')->nullable();
            }
            if (! Schema::hasColumn('User', 'status_changed_at')) {
                $table->dateTime('status_changed_at')->nullable();
            }
            if (! Schema::hasColumn('User', 'archived_at')) {
                $table->dateTime('archived_at')->nullable();
            }
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

        if (! Schema::hasColumn('Supplier', 'email')) {
            Schema::table('Supplier', fn (Blueprint $table) => $table->string('email', 100)->nullable());
        }

        Schema::table('Category', function (Blueprint $table) {
            if (! Schema::hasColumn('Category', 'status')) {
                $table->string('status', 20)->default('Active');
            }
            if (! Schema::hasColumn('Category', 'archived_at')) {
                $table->dateTime('archived_at')->nullable();
            }
            if (! Schema::hasColumn('Category', 'archived_by')) {
                $table->integer('archived_by')->nullable();
            }
        });

        Schema::table('Product', function (Blueprint $table) {
            $table->string('status', 20)->default('Active')->change();
            if (! Schema::hasColumn('Product', 'archived_at')) {
                $table->dateTime('archived_at')->nullable();
            }
            if (! Schema::hasColumn('Product', 'archived_by')) {
                $table->integer('archived_by')->nullable();
            }
            if (! Schema::hasColumn('Product', 'archive_previous_status')) {
                $table->string('archive_previous_status', 20)->nullable();
            }
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
