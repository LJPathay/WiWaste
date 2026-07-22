<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Default Accounts ───────────────────────────────────────────────
        User::firstOrCreate(
            ['username' => 'admin'],
            [
                'Full_name'  => 'Lia Cruz',
                'password'   => Hash::make('admin123'),
                'email'      => 'admin@ipharmamart.com',
                'role'       => 'Admin',
                'status'     => 'Active',
                'Created_at' => now(),
            ]
        );

        User::firstOrCreate(
            ['username' => 'inventory'],
            [
                'Full_name'  => 'Mia Stockwell',
                'password'   => Hash::make('inventory123'),
                'email'      => 'inventory@ipharmamart.com',
                'role'       => 'Inventory',
                'status'     => 'Active',
                'Created_at' => now(),
            ]
        );

        User::firstOrCreate(
            ['username' => 'cashier'],
            [
                'Full_name'  => 'Carlo Reyes',
                'password'   => Hash::make('cashier123'),
                'email'      => 'cashier@ipharmamart.com',
                'role'       => 'Business Owner',
                'status'     => 'Active',
                'Created_at' => now(),
            ]
        );

        // ── Product Categories ─────────────────────────────────────────────
        $categories = [
            'Food & Beverage',
            'Medicine & Health',
            'Personal Care',
            'Household',
            'Dairy',
            'Frozen Goods',
        ];
        foreach ($categories as $name) {
            Category::firstOrCreate(['Category_name' => $name]);
        }

        // ── Default Supplier ───────────────────────────────────────────────
        Supplier::firstOrCreate(
            ['supplier_name' => 'PharmaDist Corp'],
            [
                'contact_person' => 'Maria Santos',
                'contact_number' => '09171234567',
                'address'        => 'Quezon City, Metro Manila',
            ]
        );
    }
}
