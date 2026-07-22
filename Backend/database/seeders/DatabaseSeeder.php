<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\WastageRecord;
use App\Models\StockMovement;
use App\Models\ReturnTransaction;
use App\Models\Setting;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\AuditLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    private array $categoryMap = [];
    private array $supplierMap = [];
    private array $productMap = [];
    private array $userMap = [];

    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // ── Truncate all seeded tables ──
        AuditLog::truncate();
        PurchaseOrderItem::truncate();
        PurchaseOrder::truncate();
        ReturnTransaction::truncate();
        StockMovement::truncate();
        WastageRecord::truncate();
        SalesItem::truncate();
        SalesTransaction::truncate();
        Inventory::truncate();
        Product::truncate();
        Supplier::truncate();
        Category::truncate();
        Setting::truncate();
        User::whereNotIn('username', ['admin', 'inventory', 'cashier'])->delete();

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->seedUsers();
        $this->seedCategories();
        $this->seedSuppliers();
        $this->seedProducts();
        $this->seedInventory();
        $this->seedSales();
        $this->seedWastage();
        $this->seedStockMovements();
        $this->seedReturns();
        $this->seedPurchaseOrders();
        $this->seedSettings();
        $this->seedAuditLogs();
    }

    private function seedUsers(): void
    {
        $users = [
            ['username' => 'admin',     'Full_name' => 'Lia Cruz',       'password' => 'admin123',     'email' => 'admin@ipharmamart.com',     'role' => 'Admin',           'status' => 'Active'],
            ['username' => 'inventory', 'Full_name' => 'Mia Stockwell',  'password' => 'inventory123', 'email' => 'inventory@ipharmamart.com', 'role' => 'Inventory',        'status' => 'Active'],
            ['username' => 'cashier',   'Full_name' => 'Carlo Reyes',    'password' => 'cashier123',   'email' => 'cashier@ipharmamart.com',   'role' => 'Business Owner',   'status' => 'Active'],
        ];

        foreach ($users as $u) {
            $user = User::firstOrCreate(
                ['username' => $u['username']],
                [
                    'Full_name'  => $u['Full_name'],
                    'password'   => Hash::make($u['password']),
                    'email'      => $u['email'],
                    'role'       => $u['role'],
                    'status'     => $u['status'],
                    'Created_at' => now(),
                ]
            );
            $this->userMap[$u['username']] = $user->User_id;
        }
    }

    private function seedCategories(): void
    {
        $names = ['Food & Beverage', 'Medicine & Health', 'Personal Care', 'Household', 'Dairy', 'Frozen Goods'];
        foreach ($names as $name) {
            $cat = Category::firstOrCreate(['Category_name' => $name]);
            $this->categoryMap[$name] = $cat->Category_id;
        }
    }

    private function seedSuppliers(): void
    {
        $data = [
            ['supplier_name' => 'PharmaDist Corp',       'contact_person' => 'Maria Santos',     'contact_number' => '09171234567', 'address' => 'Quezon City, Metro Manila'],
            ['supplier_name' => 'Nestlé Philippines',     'contact_person' => 'John Reyes',       'contact_number' => '09182223344', 'address' => 'Makati City, Metro Manila'],
            ['supplier_name' => 'P&G Philippines',        'contact_person' => 'Anna Lim',         'contact_number' => '09173334455', 'address' => 'Pasig City, Metro Manila'],
            ['supplier_name' => 'Coca-Cola Beverages PH', 'contact_person' => 'Pedro Santos',     'contact_number' => '09194445566', 'address' => 'Mandaluyong City, Metro Manila'],
            ['supplier_name' => 'Del Monte Philippines',  'contact_person' => 'Sofia Garcia',     'contact_number' => '09195556677', 'address' => 'Cebu City, Cebu'],
            ['supplier_name' => 'San Miguel Corporation', 'contact_person' => 'Miguel Tan',       'contact_number' => '09196667788', 'address' => 'Pasig City, Metro Manila'],
        ];

        foreach ($data as $s) {
            $supplier = Supplier::firstOrCreate(
                ['supplier_name' => $s['supplier_name']],
                [
                    'contact_person' => $s['contact_person'],
                    'contact_number' => $s['contact_number'],
                    'address'        => $s['address'],
                ]
            );
            $this->supplierMap[$s['supplier_name']] = $supplier->supplier_id;
        }
    }

    private function seedProducts(): void
    {
        $now = now();
        $plus30 = now()->addDays(30);
        $plus60 = now()->addDays(60);
        $plus90 = now()->addDays(90);
        $expired = now()->subDays(5);

        $products = [
            ['name' => 'Biogesic Paracetamol 500mg',  'barcode' => '480123456789', 'cat' => 'Medicine & Health', 'sup' => 'PharmaDist Corp',       'cost' => 5.50,  'sell' => 7.50,  'reorder' => 50,  'exp' => $plus90],
            ['name' => 'Neozep Forte 10s',             'barcode' => '480987654321', 'cat' => 'Medicine & Health', 'sup' => 'PharmaDist Corp',       'cost' => 8.00,  'sell' => 12.00, 'reorder' => 30,  'exp' => $plus60],
            ['name' => 'Coca-Cola 1.5L',               'barcode' => '480111111111', 'cat' => 'Food & Beverage',   'sup' => 'Coca-Cola Beverages PH', 'cost' => 55.00, 'sell' => 72.00, 'reorder' => 20,  'exp' => $plus30],
            ['name' => 'C2 Green Tea 500ml',           'barcode' => '480222222222', 'cat' => 'Food & Beverage',   'sup' => 'Coca-Cola Beverages PH', 'cost' => 18.00, 'sell' => 25.00, 'reorder' => 40,  'exp' => $plus30],
            ['name' => 'Safeguard White Soap 130g',    'barcode' => '480333333333', 'cat' => 'Personal Care',     'sup' => 'P&G Philippines',        'cost' => 42.00, 'sell' => 55.00, 'reorder' => 25,  'exp' => null],
            ['name' => 'Tide Original Powder 1kg',     'barcode' => '480444444444', 'cat' => 'Household',         'sup' => 'P&G Philippines',        'cost' => 85.00, 'sell' => 110.00,'reorder' => 15,  'exp' => null],
            ['name' => 'Del Monte Tomato Sauce 250g',  'barcode' => '480555555555', 'cat' => 'Food & Beverage',   'sup' => 'Del Monte Philippines',  'cost' => 22.00, 'sell' => 30.00, 'reorder' => 35,  'exp' => $plus90],
            ['name' => 'Del Monte Pineapple Tidbits',  'barcode' => '480666666666', 'cat' => 'Food & Beverage',   'sup' => 'Del Monte Philippines',  'cost' => 45.00, 'sell' => 60.00, 'reorder' => 20,  'exp' => $plus90],
            ['name' => 'Nestlé Bear Brand 800g',       'barcode' => '480777777777', 'cat' => 'Dairy',             'sup' => 'Nestlé Philippines',     'cost' => 120.00,'sell' => 155.00,'reorder' => 12,  'exp' => $plus60],
            ['name' => 'Nestlé Coffee Creamer 200g',   'barcode' => '480888888888', 'cat' => 'Dairy',             'sup' => 'Nestlé Philippines',     'cost' => 65.00, 'sell' => 85.00, 'reorder' => 15,  'exp' => $plus60],
            ['name' => 'San Miguel Pale Pilsen 6-pack','barcode' => '480999999999', 'cat' => 'Food & Beverage',   'sup' => 'San Miguel Corporation', 'cost' => 90.00, 'sell' => 120.00,'reorder' => 10,  'exp' => $plus30],
            ['name' => 'Gardenia Classic White Bread', 'barcode' => '480000000001', 'cat' => 'Food & Beverage',   'sup' => 'San Miguel Corporation', 'cost' => 48.00, 'sell' => 65.00, 'reorder' => 20,  'exp' => $expired],
            ['name' => 'Alaska Evaporada 370ml',       'barcode' => '480000000002', 'cat' => 'Dairy',             'sup' => 'Nestlé Philippines',     'cost' => 25.00, 'sell' => 35.00, 'reorder' => 30,  'exp' => $plus90],
            ['name' => 'Milo Energy Pack 200g',        'barcode' => '480000000003', 'cat' => 'Food & Beverage',   'sup' => 'Nestlé Philippines',     'cost' => 38.00, 'sell' => 52.00, 'reorder' => 25,  'exp' => $plus60],
            ['name' => 'Head & Shoulders 200ml',       'barcode' => '480000000004', 'cat' => 'Personal Care',     'sup' => 'P&G Philippines',        'cost' => 95.00, 'sell' => 130.00,'reorder' => 10,  'exp' => null],
        ];

        foreach ($products as $p) {
            $product = Product::create([
                'category_id'     => $this->categoryMap[$p['cat']],
                'supplier_id'     => $this->supplierMap[$p['sup']],
                'barcode'         => $p['barcode'],
                'product_name'    => $p['name'],
                'cost_price'      => $p['cost'],
                'selling_price'   => $p['sell'],
                'reorder_level'   => $p['reorder'],
                'expiration_date' => $p['exp'],
                'status'          => 'Active',
            ]);
            $this->productMap[$p['name']] = $product->product_id;
        }
    }

    private function seedInventory(): void
    {
        $stocks = [
            'Biogesic Paracetamol 500mg'  => ['stock' => 200, 'status' => 'Normal'],
            'Neozep Forte 10s'            => ['stock' => 80,  'status' => 'Normal'],
            'Coca-Cola 1.5L'              => ['stock' => 45,  'status' => 'Normal'],
            'C2 Green Tea 500ml'          => ['stock' => 120, 'status' => 'Normal'],
            'Safeguard White Soap 130g'   => ['stock' => 60,  'status' => 'Normal'],
            'Tide Original Powder 1kg'    => ['stock' => 30,  'status' => 'Normal'],
            'Del Monte Tomato Sauce 250g' => ['stock' => 150, 'status' => 'Normal'],
            'Del Monte Pineapple Tidbits' => ['stock' => 40,  'status' => 'Normal'],
            'Nestlé Bear Brand 800g'      => ['stock' => 25,  'status' => 'Normal'],
            'Nestlé Coffee Creamer 200g'  => ['stock' => 35,  'status' => 'Normal'],
            'San Miguel Pale Pilsen 6-pack'=>['stock' => 20,  'status' => 'Normal'],
            'Gardenia Classic White Bread'=> ['stock' => 0,   'status' => 'Low Stock'],
            'Alaska Evaporada 370ml'      => ['stock' => 60,  'status' => 'Normal'],
            'Milo Energy Pack 200g'       => ['stock' => 45,  'status' => 'Normal'],
            'Head & Shoulders 200ml'      => ['stock' => 15,  'status' => 'Normal'],
        ];

        foreach ($stocks as $name => $s) {
            Inventory::create([
                'product_id'    => $this->productMap[$name],
                'current_stock' => $s['stock'],
                'stock_status'  => $s['status'],
                'last_updated'  => now(),
            ]);
        }
    }

    private function seedSales(): void
    {
        $adminId = $this->userMap['admin'];

        $txn1 = SalesTransaction::create([
            'user_id'          => $adminId,
            'total_amount'     => 169.50,
            'transaction_date' => now()->subDays(2),
            'payment_method'   => 'Cash',
            'amount_tendered'  => 200,
            'change_due'       => 30.50,
            'status'           => 'Completed',
        ]);

        SalesItem::create([
            'transaction_id' => $txn1->transaction_id,
            'product_id'     => $this->productMap['Biogesic Paracetamol 500mg'],
            'quantity'       => 3,
            'unit_price'     => 7.50,
            'subtotal'       => 22.50,
        ]);
        SalesItem::create([
            'transaction_id' => $txn1->transaction_id,
            'product_id'     => $this->productMap['Coca-Cola 1.5L'],
            'quantity'       => 2,
            'unit_price'     => 72.00,
            'subtotal'       => 144.00,
        ]);
        SalesItem::create([
            'transaction_id' => $txn1->transaction_id,
            'product_id'     => $this->productMap['C2 Green Tea 500ml'],
            'quantity'       => 1,
            'unit_price'     => 25.00,
            'subtotal'       => 25.00,
        ]);

        $txn2 = SalesTransaction::create([
            'user_id'          => $adminId,
            'total_amount'     => 330.00,
            'transaction_date' => now()->subDay(),
            'payment_method'   => 'E-wallet',
            'amount_tendered'  => 330.00,
            'change_due'       => 0,
            'status'           => 'Completed',
        ]);

        SalesItem::create([
            'transaction_id' => $txn2->transaction_id,
            'product_id'     => $this->productMap['Safeguard White Soap 130g'],
            'quantity'       => 2,
            'unit_price'     => 55.00,
            'subtotal'       => 110.00,
        ]);
        SalesItem::create([
            'transaction_id' => $txn2->transaction_id,
            'product_id'     => $this->productMap['Nestlé Bear Brand 800g'],
            'quantity'       => 1,
            'unit_price'     => 155.00,
            'subtotal'       => 155.00,
        ]);
        SalesItem::create([
            'transaction_id' => $txn2->transaction_id,
            'product_id'     => $this->productMap['Milo Energy Pack 200g'],
            'quantity'       => 1,
            'unit_price'     => 52.00,
            'subtotal'       => 52.00,
        ]);

        $txn3 = SalesTransaction::create([
            'user_id'          => $adminId,
            'total_amount'     => 377.50,
            'transaction_date' => now(),
            'payment_method'   => 'Cash',
            'amount_tendered'  => 400.00,
            'change_due'       => 22.50,
            'status'           => 'Completed',
        ]);

        SalesItem::create([
            'transaction_id' => $txn3->transaction_id,
            'product_id'     => $this->productMap['Del Monte Tomato Sauce 250g'],
            'quantity'       => 3,
            'unit_price'     => 30.00,
            'subtotal'       => 90.00,
        ]);
        SalesItem::create([
            'transaction_id' => $txn3->transaction_id,
            'product_id'     => $this->productMap['San Miguel Pale Pilsen 6-pack'],
            'quantity'       => 2,
            'unit_price'     => 120.00,
            'subtotal'       => 240.00,
        ]);
        SalesItem::create([
            'transaction_id' => $txn3->transaction_id,
            'product_id'     => $this->productMap['Alaska Evaporada 370ml'],
            'quantity'       => 2,
            'unit_price'     => 35.00,
            'subtotal'       => 70.00,
        ]);
    }

    private function seedWastage(): void
    {
        $adminId = $this->userMap['admin'];

        WastageRecord::create([
            'product_id'     => $this->productMap['Gardenia Classic White Bread'],
            'user_id'        => $adminId,
            'wastage_type'   => 'Expired',
            'quantity'       => 5,
            'estimated_loss' => 325.00,
            'date_recorded'  => now()->subDay(),
        ]);

        WastageRecord::create([
            'product_id'     => $this->productMap['Del Monte Pineapple Tidbits'],
            'user_id'        => $adminId,
            'wastage_type'   => 'Damaged',
            'quantity'       => 3,
            'estimated_loss' => 180.00,
            'date_recorded'  => now()->subDays(3),
        ]);
    }

    private function seedStockMovements(): void
    {
        $adminId = $this->userMap['admin'];

        StockMovement::create([
            'product_id'    => $this->productMap['Biogesic Paracetamol 500mg'],
            'user_id'       => $adminId,
            'movement_type' => 'Stock In',
            'quantity'      => 200,
            'remarks'       => 'Initial stock',
            'movement_date' => now()->subDays(10),
        ]);

        StockMovement::create([
            'product_id'    => $this->productMap['Coca-Cola 1.5L'],
            'user_id'       => $adminId,
            'movement_type' => 'Stock In',
            'quantity'      => 100,
            'remarks'       => 'Initial stock',
            'movement_date' => now()->subDays(10),
        ]);
    }

    private function seedReturns(): void
    {
        $adminId = $this->userMap['admin'];
        $saleItem = SalesItem::first();

        if ($saleItem) {
            ReturnTransaction::create([
                'sale_item_id'     => $saleItem->sales_item_id,
                'user_id'          => $adminId,
                'quantity_returned'=> 1,
                'reason'           => 'Customer changed mind',
                'refund_amount'    => $saleItem->unit_price,
                'return_date'      => now()->subDay(),
            ]);
        }
    }

    private function seedPurchaseOrders(): void
    {
        $adminId = $this->userMap['admin'];
        $supplierId = $this->supplierMap['PharmaDist Corp'];

        $po = PurchaseOrder::create([
            'supplier_id'  => $supplierId,
            'user_id'      => $adminId,
            'po_number'    => 'PO-20260722-000001',
            'status'       => 'Received',
            'total_amount' => 275.00,
            'notes'        => 'Restock order',
            'created_at'   => now()->subDays(5),
            'updated_at'   => now()->subDays(3),
        ]);

        PurchaseOrderItem::create([
            'po_id'       => $po->po_id,
            'product_id'  => $this->productMap['Biogesic Paracetamol 500mg'],
            'quantity'    => 50,
            'unit_price'  => 5.50,
            'subtotal'    => 275.00,
            'received_qty'=> 50,
        ]);
    }

    private function seedSettings(): void
    {
        $settings = [
            'store_name'     => 'iPharmaMart',
            'store_address'  => '123 Rizal St., Manila',
            'store_contact'  => '02-8123-4567',
            'vat_rate'       => '12',
            'currency'       => 'PHP',
            'low_stock_threshold' => '10',
        ];

        foreach ($settings as $key => $value) {
            Setting::firstOrCreate(compact('key'), compact('value'));
        }
    }

    private function seedAuditLogs(): void
    {
        $adminId = $this->userMap['admin'];

        AuditLog::create([
            'user_id'     => $adminId,
            'action'      => 'Database seeded with initial data',
            'entity_type' => 'System',
            'entity_id'   => null,
            'old_values'  => null,
            'new_values'  => null,
            'created_at'  => now(),
        ]);
    }
}
