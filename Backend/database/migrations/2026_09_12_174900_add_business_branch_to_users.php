<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add business_id and branch_id columns if they don't exist
        Schema::table('User', function (Blueprint $table) {
            if (!Schema::hasColumn('User', 'business_id')) {
                $table->foreignId('business_id')->nullable()->constrained()->onDelete('cascade');
            }
            if (!Schema::hasColumn('User', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained()->onDelete('cascade');
            }
        });

        // Now handle the role column change in three steps to avoid data loss
        // Step 1: Expand the enum to include the new roles
        DB::statement("ALTER TABLE User MODIFY role ENUM('Admin', 'Inventory', 'Business Owner', 'Owner', 'Cashier', 'Pharmacist')");

        // Step 2: Update the role for Admin and Business Owner to Owner
        DB::table('User')->whereIn('role', ['Admin', 'Business Owner'])->update(['role' => 'Owner']);

        // Step 3: Now shrink the enum to the desired set (remove the old roles that are no longer used)
        DB::statement("ALTER TABLE User MODIFY role ENUM('Owner', 'Inventory', 'Cashier', 'Pharmacist') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We cannot perfectly reverse the role update because we don't know which Owner was originally Admin or Business Owner.
        // We will convert all Owner back to Admin as a best effort.

        // First, change the role column to a string to allow any value during the rollback
        DB::statement("ALTER TABLE User MODIFY role VARCHAR(50)");

        // Then, update the role: set Owner to Admin (as a default, since we don't know the original)
        DB::table('User')->where('role', 'Owner')->update(['role' => 'Admin']);

        // Then, change the role enum back to the old set
        DB::statement("ALTER TABLE User MODIFY role ENUM('Admin', 'Inventory', 'Business Owner') NOT NULL");

        // Remove the foreign key constraints and columns if they exist
        Schema::table('User', function (Blueprint $table) {
            if (Schema::hasColumn('User', 'business_id')) {
                $table->dropForeign(['business_id']);
                $table->dropColumn('business_id');
            }
            if (Schema::hasColumn('User', 'branch_id')) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            }
        });
    }
};