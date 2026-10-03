<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adds the co-admin role QA requires.
 *
 * The `role` column is an ENUM that was last narrowed to
 * ('Owner','Inventory','Cashier','Pharmacist'), but CreateUserRequest still
 * validated `in:Admin,Inventory,Business Owner,Cashier,Pharmacist`. "Admin" and
 * "Business Owner" therefore passed validation, were rejected by the column, and
 * MySQL raised:
 *
 *   SQLSTATE[01000]: Warning: 1265 Data truncated for column 'role' at row 1
 *
 * which left the role stored as an empty string. The empty role is what produced the
 * downstream "Cannot read properties of undefined (reading 'toLowerCase')" crash when
 * the new user was rendered back into the Manage Users table.
 *
 * This migration adds 'Admin' so the value QA selects is actually storable. 'Admin' is
 * treated as owner-equivalent for authorization via Role::isOwnerTier().
 */
return new class extends Migration
{
    private const VALUES = "'Owner','Admin','Inventory','Cashier','Pharmacist'";

    /**
     * MODIFY COLUMN has to restate nullability and the default, so read both from the
     * live column first rather than inventing them and silently changing insert
     * behaviour for callers that omit `role`.
     */
    private function alter(string $values): void
    {
        $column = DB::selectOne(
            "SELECT IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME = 'role'"
        );

        $nullable = $column->IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';

        // An empty COLUMN_DEFAULT means the column had no explicit default; emitting
        // DEFAULT '' would change it to an empty enum value, which is precisely the
        // truncated state this migration exists to prevent.
        $default = ($column->COLUMN_DEFAULT === null || $column->COLUMN_DEFAULT === '')
            ? ''
            : " DEFAULT '" . $column->COLUMN_DEFAULT . "'";

        DB::statement(
            "ALTER TABLE `User` MODIFY COLUMN `role` ENUM({$values}) {$nullable}{$default}"
        );
    }

    public function up(): void
    {
        // 'Business Owner' was the pre-canonical name for the owner tier. Fold it in
        // before narrowing the column, otherwise any surviving row would be truncated
        // to '' by the ALTER itself.
        DB::table('User')->where('role', 'Business Owner')->update(['role' => 'Owner']);

        $this->alter(self::VALUES);
    }

    public function down(): void
    {
        // Anything stored as 'Admin' would not survive the rollback, so promote it to
        // 'Owner' (the co-admin tier) rather than leaving rows with a truncated value.
        DB::table('User')->where('role', 'Admin')->update(['role' => 'Owner']);

        $this->alter("'Owner','Inventory','Cashier','Pharmacist'");
    }
};