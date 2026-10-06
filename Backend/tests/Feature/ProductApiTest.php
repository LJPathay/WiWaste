<?php

/**
 * Pest coverage for the product API: creation, validation and — most importantly —
 * the response shape Phase 10 standardised through ProductResource.
 *
 * The frontend types every list call as `PaginatedResponse<T>` (flat `data` +
 * `current_page` + `total` siblings) and every single record as a flat object, so
 * these tests pin both envelopes down: a regression that switches a controller to
 * `XResource::collection()` or a bare `new XResource()` would silently wrap the
 * payload in `data`/`links`/`meta` and break pagination in the UI without failing
 * a single database assertion.
 */

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->owner = User::factory()->role('Owner')->create();
    $this->category = Category::create(['Category_name' => 'Analgesics '.uniqid()]);
    $this->supplier = Supplier::create([
        'supplier_name' => 'Pest Supplier '.uniqid(),
        'contact_number' => '09171234567',
    ]);

    Sanctum::actingAs($this->owner);
});

/** The payload every product test starts from; callers merge their own overrides. */
function productPayload(array $overrides = []): array
{
    return array_merge([
        'category_id' => test()->category->Category_id,
        'supplier_id' => test()->supplier->supplier_id,
        'barcode' => '480'.str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
        'product_name' => 'Ibuprofen 200mg',
        'cost_price' => 8.00,
        'selling_price' => 15.00,
        'reorder_level' => 10,
        'expiration_date' => now()->addYear()->toDateString(),
        'status' => 'Active',
        'initial_stock' => 40,
    ], $overrides);
}

it('creates a product and answers with the ProductResource whitelist', function () {
    $response = $this->postJson('/api/v1/products', productPayload());

    $response->assertStatus(201);

    $product = Product::where('product_name', 'Ibuprofen 200mg')->firstOrFail();

    $response
        ->assertJsonPath('id', $product->product_id)
        ->assertJsonPath('name', 'Ibuprofen 200mg')
        ->assertJsonPath('sku', $product->barcode)
        ->assertJsonPath('plu_code', (string) $product->product_id)
        ->assertJsonPath('category', $this->category->Category_name)
        ->assertJsonPath('supplier', $this->supplier->supplier_name)
        ->assertJsonPath('status', 'Active')
        ->assertJsonPath('stock_status', 'Normal');

    // `current_stock` has no cast, so its JSON type rides on the PDO driver.
    expect((int) $response->json('stock'))->toBe(40);

    // No timestamps, no raw table columns leaking through.
    expect($response->json())
        ->toHaveKeys(['id', 'name', 'sku', 'category', 'stock', 'stock_status'])
        ->not->toHaveKey('created_at')
        ->not->toHaveKey('updated_at')
        ->not->toHaveKey('product_name')
        ->not->toHaveKey('barcode');

    // The store flow also opens the initial inventory row.
    $this->assertDatabaseHas('Inventory', [
        'product_id' => $product->product_id,
        'current_stock' => 40,
    ]);
});

it('rejects a product that omits required fields with a 422', function () {
    $this->postJson('/api/v1/products', ['product_name' => 'No prices'])
        ->assertStatus(422)
        ->assertJsonValidationErrors([
            'category_id',
            'supplier_id',
            'cost_price',
            'selling_price',
            'reorder_level',
        ]);
});

it('rejects a status that is not a ProductStatus case', function () {
    // The enum-backed rule is the only thing standing between the API and the
    // MySQL ENUM, where an unknown value is a silent "Data truncated" warning
    // rather than an error.
    $this->postJson('/api/v1/products', productPayload(['status' => 'Retired']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

it('lists products in the flat paginator envelope the frontend reads', function () {
    $product = Product::create(array_diff_key(productPayload(), ['initial_stock' => true]));

    $response = $this->getJson('/api/v1/products');

    $response
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'name', 'sku', 'category', 'status']],
            'current_page',
            'last_page',
            'per_page',
            'total',
            'from',
            'to',
        ])
        ->assertJsonPath('data.0.id', $product->product_id)
        ->assertJsonPath('data.0.name', 'Ibuprofen 200mg')
        ->assertJsonPath('total', 1);

    // `XResource::collection()` would have answered {data, links, meta}; the flat
    // paginator keeps `links` (its own nav block) but must not grow a `meta` wrapper.
    expect($response->json())
        ->toHaveKey('links')
        ->not->toHaveKey('meta')
        ->and($response->json('data.0'))
        ->not->toHaveKey('created_at');
});

it('looks a product up by barcode as a flat object', function () {
    $product = Product::create(array_diff_key(productPayload(), ['initial_stock' => true]));
    Inventory::create([
        'product_id' => $product->product_id,
        'current_stock' => 40,
        'stock_status' => 'Normal',
        'last_updated' => now(),
    ]);

    $response = $this->getJson('/api/v1/products/lookup/'.$product->barcode);

    $response
        ->assertOk()
        ->assertJsonPath('id', $product->product_id)
        ->assertJsonPath('sku', $product->barcode)
        ->assertJsonPath('plu_code', (string) $product->product_id);

    expect((int) $response->json('stock'))->toBe(40);

    // A single JsonResource returned directly is wrapped in `data` by default.
    expect($response->json())->not->toHaveKey('data');
});
