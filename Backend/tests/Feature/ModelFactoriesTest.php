<?php

/**
 * Phase 17.2: model factories for the five entities the suites build rows for.
 *
 * Every table here is PascalCase with a non-standard primary key, so the factories
 * are the one place those quirks are encoded — a test can ask for a product and get
 * a category and supplier with it instead of hand-writing three inserts.
 */

use App\Models\Category;
use App\Models\Product;
use App\Models\SalesTransaction;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('builds a category with a name and an Active default', function () {
    $category = Category::factory()->create();

    expect($category->Category_name)->not->toBe('')
        ->and($category->status)->toBe('Active');

    expect(Category::factory()->archived()->create()->status)->toBe('Archived');
});

it('builds a supplier with the required contact fields', function () {
    $supplier = Supplier::factory()->create();

    expect($supplier->supplier_name)->not->toBe('')
        ->and($supplier->contact_number)->not->toBe('');
});

it('builds a product wired to its own category and supplier', function () {
    $product = Product::factory()->create();

    expect($product->barcode)->not->toBe('')
        ->and($product->status)->toBe('Active')
        ->and($product->category)->toBeInstanceOf(Category::class)
        ->and($product->supplier)->toBeInstanceOf(Supplier::class)
        ->and((float) $product->selling_price)->toBeGreaterThan(0);

    expect(Product::factory()->discontinued()->create()->status)->toBe('Discontinued');
});

it('builds a sale owned by a user', function () {
    $cashier = User::factory()->role('Cashier')->create();
    $sale = SalesTransaction::factory()->create(['user_id' => $cashier->User_id]);

    expect($sale->status)->toBe('Completed')
        ->and((float) $sale->total_amount)->toBeGreaterThan(0)
        ->and($sale->user)->toBeInstanceOf(User::class)
        ->and($sale->user->role)->toBe('Cashier');
});
