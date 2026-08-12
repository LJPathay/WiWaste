<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SalesItem;
use App\Models\SalesTransaction;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Models\WastageRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventorySyncTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private function makeUser(): User
    {
        return User::create([
            'Full_name'  => 'Test Cashier',
            'username'   => 'cashier-test',
            'password'   => Hash::make('password'),
            'email'      => 'cashier@test.com',
            'role'       => 'Business Owner',
            'status'     => 'Active',
            'Created_at' => now(),
        ]);
    }

    private function auth(): void
    {
        $this->user ??= $this->makeUser();
        Sanctum::actingAs($this->user);
    }

    private function makeProduct(array $overrides = []): Product
    {
        $category = Category::create(['Category_name' => 'Medicine & Health ' . random_int(1000, 9999)]);
        $supplier = Supplier::create([
            'supplier_name'  => 'Test Supplier',
            'contact_number' => '09171234567',
        ]);

        $product = Product::create(array_merge([
            'category_id'     => $category->Category_id,
            'supplier_id'     => $supplier->supplier_id,
            'barcode'         => '480' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'product_name'    => 'Test Product ' . random_int(100, 999),
            'cost_price'      => 10.00,
            'selling_price'   => 15.00,
            'reorder_level'   => 5,
            'expiration_date' => now()->addMonths(6),
            'status'          => 'Active',
        ], $overrides));

        Inventory::create([
            'product_id'    => $product->product_id,
            'current_stock' => 50,
            'stock_status'  => 'Normal',
            'last_updated'  => now(),
        ]);

        return $product;
    }

    public function test_sale_syncs_stock(): void
    {
        $this->auth();
        $productA = $this->makeProduct();
        $productB = $this->makeProduct();

        $response = $this->postJson('/api/sales', [
            'payment_method'  => 'Cash',
            'amount_tendered' => 100,
            'change_due'      => 10,
            'items'           => [
                ['product_id' => $productA->product_id, 'quantity' => 3, 'unit_price' => 15.00],
                ['product_id' => $productB->product_id, 'quantity' => 2, 'unit_price' => 15.00],
            ],
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $productA->product_id,
            'current_stock' => 47,
        ]);
        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $productB->product_id,
            'current_stock' => 48,
        ]);

        $transaction = SalesTransaction::where('user_id', $this->user->User_id)->firstOrFail();
        $this->assertSame(2, SalesItem::where('transaction_id', $transaction->transaction_id)->count());
        $this->assertSame(1, StockMovement::where('product_id', $productA->product_id)
            ->where('movement_type', 'Stock Out')
            ->where('quantity', 3)
            ->count());
        $this->assertSame(1, StockMovement::where('product_id', $productB->product_id)
            ->where('movement_type', 'Stock Out')
            ->where('quantity', 2)
            ->count());
    }

    public function test_sale_cannot_exceed_stock(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $product->inventory()->update(['current_stock' => 2]);

        $response = $this->postJson('/api/sales', [
            'payment_method'  => 'Cash',
            'amount_tendered' => 100,
            'change_due'      => 0,
            'items'           => [
                ['product_id' => $product->product_id, 'quantity' => 5, 'unit_price' => 15.00],
            ],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 2,
        ]);
        $this->assertDatabaseCount('Sales_Transaction', 0);
        $this->assertDatabaseCount('Sales_Item', 0);
    }

    public function test_stock_out_cannot_go_negative(): void
    {
        $this->auth();
        $product = $this->makeProduct(['reorder_level' => 10]);
        $product->inventory()->update(['current_stock' => 5]);

        $response = $this->postJson('/api/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 10,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 5,
        ]);
    }

    public function test_wastage_syncs_stock(): void
    {
        $this->auth();
        $product = $this->makeProduct();

        $response = $this->postJson('/api/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Expired',
            'quantity'       => 4,
            'estimated_loss' => 40.00,
            'date_recorded'  => now()->toDateTimeString(),
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 46,
        ]);
        $this->assertDatabaseHas('Wastage_Record', [
            'product_id' => $product->product_id,
            'quantity'   => 4,
        ]);
        $this->assertDatabaseHas('Stock_Movement', [
            'product_id'    => $product->product_id,
            'movement_type' => 'Stock Out',
            'quantity'      => 4,
        ]);
    }

    public function test_wastage_cannot_exceed_stock(): void
    {
        $this->auth();
        $product = $this->makeProduct();
        $product->inventory()->update(['current_stock' => 2]);

        $response = $this->postJson('/api/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Damaged',
            'quantity'       => 5,
            'estimated_loss' => 50.00,
            'date_recorded'  => now()->toDateTimeString(),
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 2,
        ]);
    }

    public function test_barcode_lookup_returns_product(): void
    {
        $this->auth();
        $product = $this->makeProduct();

        $response = $this->getJson("/api/products/lookup/{$product->barcode}");

        $response->assertOk()
            ->assertJsonPath('id', $product->product_id)
            ->assertJsonPath('sku', $product->barcode);
    }

    public function test_barcode_lookup_unknown_code_returns_404(): void
    {
        $this->auth();

        $this->getJson('/api/products/lookup/999999999999')
            ->assertStatus(404);
    }

    public function test_stock_in_adds_stock(): void
    {
        $this->auth();
        $product = $this->makeProduct();

        $response = $this->postJson('/api/inventory/stock-in', [
            'product_id' => $product->product_id,
            'quantity'   => 20,
        ]);

        $response->assertStatus(200)->assertJsonPath('new_stock', 70);

        $this->assertDatabaseHas('Inventory', [
            'product_id'    => $product->product_id,
            'current_stock' => 70,
        ]);
        $this->assertDatabaseHas('Stock_Movement', [
            'product_id'    => $product->product_id,
            'movement_type' => 'Stock In',
            'quantity'      => 20,
        ]);
    }
}
