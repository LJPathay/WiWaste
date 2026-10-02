<?php

namespace Tests\Concerns;

use App\Models\Branch;
use App\Models\Business;
use App\Models\Category;
use App\Models\FEFOBatch;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;

/**
 * Minimal builders for the PascalCase schema (Product, Inventory, FEFO_Batch, …).
 *
 * These tables have no model factories yet, so the suites assemble the rows they
 * need directly. Column names mirror the migrations exactly.
 */
trait CreatesInventoryFixtures
{
    private int $categorySeq = 0;
    private int $supplierSeq = 0;
    private int $productSeq = 0;
    private int $batchSeq = 0;

    private ?Business $business = null;
    private ?Branch $branch = null;

    /**
     * wastage_flags and Wastage_Record both carry business_id / branch_id, so
     * a confirm() flow needs real parent rows for the foreign keys.
     */
    protected function makeBusiness(): Business
    {
        return $this->business ??= Business::create([
            'name'          => 'Test Pharmacy',
            'business_type' => 'pharmacy',
        ]);
    }

    protected function makeBranch(): Branch
    {
        return $this->branch ??= Branch::create([
            'business_id' => $this->makeBusiness()->id,
            'name'        => 'Main Branch',
        ]);
    }

    protected function makeCategory(?string $name = null): Category
    {
        return Category::create([
            'Category_name' => $name ?? 'Category ' . ++$this->categorySeq,
        ]);
    }

    protected function makeSupplier(?string $name = null): Supplier
    {
        return Supplier::create([
            'supplier_name'   => $name ?? 'Supplier ' . ++$this->supplierSeq,
            'contact_person'  => 'Test Contact',
            'contact_number'  => '09171234567',
            'address'         => 'Test Address',
        ]);
    }

    protected function makeProduct(array $overrides = []): Product
    {
        $seq = ++$this->productSeq;

        return Product::create(array_merge([
            'category_id'     => $overrides['category_id'] ?? $this->makeCategory()->Category_id,
            'supplier_id'     => $overrides['supplier_id'] ?? $this->makeSupplier()->supplier_id,
            'barcode'         => 'BC' . str_pad((string) $seq, 8, '0', STR_PAD_LEFT),
            'product_name'    => 'Product ' . $seq,
            'cost_price'      => 10.00,
            'selling_price'   => 25.00,
            'reorder_level'   => 20,
            'expiration_date' => now()->addYear()->toDateString(),
            'status'          => 'Active',
        ], $overrides));
    }

    protected function makeInventory(Product $product, int $stock = 100, array $overrides = []): Inventory
    {
        return Inventory::create(array_merge([
            'business_id'   => null,
            'branch_id'     => null,
            'product_id'    => $product->product_id,
            'current_stock' => $stock,
            'stock_status'  => Inventory::calcStatus($stock, $product->reorder_level),
            'last_updated'  => now(),
        ], $overrides));
    }

    protected function makeBatch(Product $product, int $quantity, string $expiry, array $overrides = []): FEFOBatch
    {
        $seq = ++$this->batchSeq;

        return FEFOBatch::create(array_merge([
            'business_id'   => null,
            'branch_id'     => null,
            'product_id'    => $product->product_id,
            'batch_number'  => 'BATCH-' . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            'quantity'      => $quantity,
            'expiry_date'   => $expiry,
            'status'        => 'active',
            'created_by'    => null,
            'created_at'    => now(),
            'received_date' => now()->subDay()->toDateString(),
        ], $overrides));
    }

    protected function makeInventoryUser(string $role = 'Inventory', array $overrides = []): User
    {
        return User::factory()->role($role)->create($overrides);
    }
}