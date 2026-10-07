<?php

/**
 * Phase 19 — cache strategy.
 *
 * Both halves fail silently when they regress, which is why they are pinned down
 * here rather than left to code review:
 *
 *  - the HTTP window the product list hands out. The rows are scoped to the
 *    caller's business and branch, so anything shared in front of the API has to
 *    vary on the token rather than on the URL alone;
 *
 *  - the "forever" category cache. Its only defence against serving yesterday's
 *    rows is that every write drops the key — Category's *and* Product's, since
 *    the cached rows carry `products_count`.
 */

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->owner = User::factory()->role('Owner')->create();
    Sanctum::actingAs($this->owner);
});

it('sends a one-minute public cache window on the product list', function () {
    $response = $this->getJson('/api/v1/products');

    $response->assertOk();

    // Symfony re-orders the directives it receives (`max-age=60, public`), so assert
    // on the set rather than the literal string.
    expect(explode(', ', (string) $response->headers->get('Cache-Control')))
        ->toEqualCanonicalizing(['public', 'max-age=60']);

    expect($response->headers->get('Vary'))->toContain('Authorization');
});

it('serves the category list from a cache that only a model write can drop', function () {
    Cache::forget(Category::CACHE_KEY);

    // A cold cache fills on the first read…
    expect($this->getJson('/api/v1/categories')->json('meta.total'))->toBe(0);
    expect(Cache::has(Category::CACHE_KEY))->toBeTrue();

    // …and is then authoritative. This row bypasses Eloquent entirely, so no model
    // event fires and the cached list is the only thing that can answer.
    $ghost = 'Ghost '.uniqid();
    DB::table('Category')->insert(['Category_name' => $ghost]);

    expect($this->getJson('/api/v1/categories')->json('meta.total'))->toBe(0);

    // A model write is what finally drops the key.
    $written = 'Written '.uniqid();
    Category::create(['Category_name' => $written]);

    expect(Cache::has(Category::CACHE_KEY))->toBeFalse();

    $names = collect($this->getJson('/api/v1/categories')->json('data'))->pluck('name');
    expect($names)->toContain($written)->toContain($ghost);
});

it('filters the cached category list the way the query used to', function () {
    $active = 'Analgesics '.uniqid();
    $archived = 'Retired '.uniqid();
    Category::create(['Category_name' => $active]);
    Category::create(['Category_name' => $archived, 'status' => 'Archived']);

    // The default list still hides archived rows (pickers must not offer them)…
    $default = collect($this->getJson('/api/v1/categories')->json('data'))->pluck('name');
    expect($default)->toContain($active)->and($default)->not->toContain($archived);

    // …an explicit status tab still reaches them…
    $tab = collect($this->getJson('/api/v1/categories?status=Archived')->json('data'))->pluck('name');
    expect($tab)->toContain($archived);

    // …and search is still the case-insensitive `LIKE %x%`, matched in memory now.
    $needle = strtolower(substr($active, 0, 8));
    $found = collect($this->getJson('/api/v1/categories?search='.$needle)->json('data'))->pluck('name');
    expect($found)->toContain($active);
});

it('drops the cached category list when a product write moves its count', function () {
    Category::create(['Category_name' => 'Counted '.uniqid()]);

    $this->getJson('/api/v1/categories');
    expect(Cache::has(Category::CACHE_KEY))->toBeTrue();

    $supplier = Supplier::create([
        'supplier_name' => 'Cache Supplier '.uniqid(),
        'contact_number' => '09171234567',
    ]);

    Product::create([
        'category_id' => Category::firstOrFail()->Category_id,
        'supplier_id' => $supplier->supplier_id,
        'barcode' => '480'.str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
        'product_name' => 'Cached Product',
        'cost_price' => 8.00,
        'selling_price' => 15.00,
        'reorder_level' => 10,
        'expiration_date' => now()->addYear()->toDateString(),
        'status' => 'Active',
    ]);

    // The cached rows carry `products_count`, so a product save has to drop the key
    // as well — otherwise a category picker would report whatever count it happened
    // to read first.
    expect(Cache::has(Category::CACHE_KEY))->toBeFalse();
});
