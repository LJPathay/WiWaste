<?php

/**
 * Pest coverage for the POS sale endpoint: the receipt payload the cashier screen
 * renders from, the flat paginator the sales history reads, and the fact that a
 * completed sale kicks the analytics cache warm-up job (Phase 15).
 *
 * Stock movement itself is asserted in InventorySyncTest; this file is about the
 * API contract.
 */

use App\Jobs\WarmAnalyticsCache;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->cashier = User::factory()->role('Cashier')->create();
    $this->category = Category::create(['Category_name' => 'Beverages '.uniqid()]);
    $this->supplier = Supplier::create([
        'supplier_name' => 'Sale Supplier '.uniqid(),
        'contact_number' => '09171234567',
    ]);
    $this->product = Product::create([
        'category_id' => $this->category->Category_id,
        'supplier_id' => $this->supplier->supplier_id,
        'barcode' => '480'.str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
        'product_name' => 'Bottled Water 500ml',
        'cost_price' => 8.00,
        'selling_price' => 15.00,
        'reorder_level' => 10,
        'expiration_date' => now()->addYear()->toDateString(),
        'status' => 'Active',
    ]);
    Inventory::create([
        'product_id' => $this->product->product_id,
        'current_stock' => 50,
        'stock_status' => 'Normal',
        'last_updated' => now(),
    ]);

    Sanctum::actingAs($this->cashier);
});

it('records a sale and answers with the totals the receipt needs', function () {
    Bus::fake([WarmAnalyticsCache::class]);

    $response = $this->postJson('/api/v1/sales', [
        'payment_method' => 'Cash',
        'amount_tendered' => 100,
        'change_due' => 55,
        'items' => [
            ['product_id' => $this->product->product_id, 'quantity' => 3, 'unit_price' => 15.00],
        ],
    ]);

    $response
        ->assertStatus(201)
        ->assertJsonPath('message', 'Transaction completed.')
        ->assertJsonStructure(['transaction_id', 'total_amount', 'vat_amount', 'vatable_amount']);

    expect($response->json('transaction_id'))->toBeInt()
        ->and((float) $response->json('total_amount'))->toEqual(45.0);

    $this->assertDatabaseCount('Sales_Transaction', 1);
    $this->assertDatabaseHas('Inventory', [
        'product_id' => $this->product->product_id,
        'current_stock' => 47,
    ]);

    Bus::assertDispatched(WarmAnalyticsCache::class);
});

it('lists sales in the flat paginator envelope with resource fields', function () {
    $this->postJson('/api/v1/sales', [
        'payment_method' => 'Cash',
        'amount_tendered' => 100,
        'change_due' => 85,
        'items' => [
            ['product_id' => $this->product->product_id, 'quantity' => 1, 'unit_price' => 15.00],
        ],
    ])->assertStatus(201);

    $response = $this->getJson('/api/v1/sales');

    $response
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'cashier', 'payment_method', 'items']],
            'current_page',
            'last_page',
            'per_page',
            'total',
            'from',
            'to',
        ])
        ->assertJsonPath('data.0.payment_method', 'Cash')
        ->assertJsonPath('data.0.items.0.product_name', 'Bottled Water 500ml')
        ->assertJsonPath('data.0.items.0.sku', $this->product->barcode)
        ->assertJsonPath('total', 1);

    // A resource collection would have answered {data, links, meta}; the flat
    // paginator carries its own `links` nav block but no `meta` wrapper.
    expect($response->json())
        ->toHaveKey('links')
        ->not->toHaveKey('meta')
        ->and($response->json('data.0'))
        ->not->toHaveKey('created_at')
        ->toBeArray();
});

it('answers a single sale with the SaleResource object, not a wrapped one', function () {
    $transactionId = $this->postJson('/api/v1/sales', [
        'payment_method' => 'E-wallet',
        'amount_tendered' => 15,
        'change_due' => 0,
        'items' => [
            ['product_id' => $this->product->product_id, 'quantity' => 1, 'unit_price' => 15.00],
        ],
    ])->assertStatus(201)->json('transaction_id');

    $response = $this->getJson('/api/v1/sales/'.$transactionId);

    $response
        ->assertOk()
        ->assertJsonPath('id', $transactionId)
        ->assertJsonPath('payment_method', 'E-wallet')
        ->assertJsonPath('items.0.product_name', 'Bottled Water 500ml');

    // `new SaleResource()` returned straight from the controller would sit under `data`.
    expect($response->json())->not->toHaveKey('data');
});
