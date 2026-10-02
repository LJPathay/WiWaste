<?php

namespace Tests\Feature\Inventory;

use App\Models\FEFOBatch;
use App\Models\Inventory;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesInventoryFixtures;
use Tests\TestCase;

class StockMovementTest extends TestCase
{
    use CreatesInventoryFixtures, RefreshDatabase;

    private function actingAsInventory(): void
    {
        Sanctum::actingAs($this->makeInventoryUser('Inventory'));
    }

    // === POST /api/v1/inventory/stock-in ===

    public function test_stock_in_increases_stock_and_writes_a_movement(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 15);

        $this->postJson('/api/v1/inventory/stock-in', [
            'product_id' => $product->product_id,
            'quantity'   => 10,
            'remarks'    => 'Weekly delivery',
        ])->assertOk()->assertJsonPath('new_stock', 25);

        $inventory->refresh();

        $this->assertSame(25, $inventory->current_stock);
        $this->assertSame('Normal', $inventory->stock_status);

        $this->assertDatabaseHas('Stock_Movement', [
            'product_id'    => $product->product_id,
            'movement_type' => 'Stock In',
            'quantity'      => 10,
        ]);
    }

    public function test_stock_in_reclassifies_the_stock_status(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 10);

        $this->assertSame('Low Stock', $inventory->stock_status);

        $this->postJson('/api/v1/inventory/stock-in', [
            'product_id' => $product->product_id,
            'quantity'   => 15,
        ])->assertOk();

        // 25 is above the reorder level but below 5x it.
        $this->assertSame('Normal', $inventory->fresh()->stock_status);
    }

    public function test_stock_in_rejects_a_zero_quantity(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();
        $this->makeInventory($product, 10);

        $this->postJson('/api/v1/inventory/stock-in', [
            'product_id' => $product->product_id,
            'quantity'   => 0,
        ])->assertStatus(422)->assertJsonValidationErrors('quantity');
    }

    public function test_stock_in_rejects_an_unknown_product(): void
    {
        $this->actingAsInventory();

        $this->postJson('/api/v1/inventory/stock-in', [
            'product_id' => 999999,
            'quantity'   => 5,
        ])->assertStatus(422)->assertJsonValidationErrors('product_id');
    }

    // === POST /api/v1/inventory/receive (batch-aware stock-in) ===

    public function test_receive_creates_a_fefo_batch_and_ties_the_movement_to_it(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 0);

        $this->postJson('/api/v1/inventory/receive', [
            'product_id'   => $product->product_id,
            'quantity'     => 60,
            'batch_number' => 'LOT-777',
            'expiry_date'  => now()->addMonths(6)->toDateString(),
        ])->assertOk();

        $batch = FEFOBatch::where('batch_number', 'LOT-777')->firstOrFail();

        $this->assertSame(60, $batch->quantity);
        $this->assertSame('active', $batch->status);
        $this->assertSame(60, $inventory->fresh()->current_stock);

        $this->assertDatabaseHas('Stock_Movement', [
            'product_id' => $product->product_id,
            'batch_id'   => $batch->batch_id,
            'quantity'   => 60,
        ]);
    }

    public function test_receiving_the_same_batch_twice_tops_it_up(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $this->makeInventory($product, 0);

        $payload = [
            'product_id'   => $product->product_id,
            'batch_number' => 'LOT-888',
            'expiry_date'  => now()->addMonths(9)->toDateString(),
        ];

        $this->postJson('/api/v1/inventory/receive', $payload + ['quantity' => 20])->assertOk();
        $this->postJson('/api/v1/inventory/receive', $payload + ['quantity' => 15])->assertOk();

        $batch = FEFOBatch::where('batch_number', 'LOT-888')->firstOrFail();

        $this->assertSame(1, FEFOBatch::where('batch_number', 'LOT-888')->count());
        $this->assertSame(35, $batch->quantity);
    }

    public function test_receive_rejects_an_expiry_in_the_past(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();
        $this->makeInventory($product, 0);

        $this->postJson('/api/v1/inventory/receive', [
            'product_id'   => $product->product_id,
            'quantity'     => 10,
            'batch_number' => 'LOT-OLD',
            'expiry_date'  => now()->subDay()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('expiry_date');
    }

    // === POST /api/v1/inventory/stock-out (FEFO enforcement) ===

    public function test_stock_out_consumes_the_earliest_expiring_batch_first(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 100);

        $late = $this->makeBatch($product, 40, now()->addDays(90)->toDateString());
        $early = $this->makeBatch($product, 30, now()->addDays(5)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 50,
        ])->assertOk()->assertJsonPath('new_stock', 50);

        $this->assertSame(0, $early->fresh()->quantity, 'The 5-day batch must be drained first.');
        $this->assertSame(20, $late->fresh()->quantity, 'The 90-day batch absorbs the remainder.');
        $this->assertSame(50, $inventory->fresh()->current_stock);

        // One movement per batch consumed, oldest expiry first.
        $movements = StockMovement::where('movement_type', 'Stock Out')
            ->orderBy('movement_id')
            ->get(['batch_id', 'quantity']);

        $this->assertSame([
            ['batch_id' => $early->batch_id, 'quantity' => 30],
            ['batch_id' => $late->batch_id,  'quantity' => 20],
        ], $movements->map(fn ($m) => ['batch_id' => $m->batch_id, 'quantity' => (int) $m->quantity])->all());
    }

    public function test_stock_out_ignores_flagged_batches(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $this->makeInventory($product, 60);

        $this->makeBatch($product, 20, now()->addDays(2)->toDateString(), ['status' => 'flagged']);
        $usable = $this->makeBatch($product, 40, now()->addDays(60)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 20,
        ])->assertOk();

        $this->assertSame(20, $usable->fresh()->quantity);
        $this->assertSame(
            1,
            StockMovement::where('movement_type', 'Stock Out')->where('batch_id', $usable->batch_id)->count()
        );
    }

    public function test_stock_out_honours_an_explicit_batch_id(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $this->makeInventory($product, 100);

        $early = $this->makeBatch($product, 30, now()->addDays(5)->toDateString());
        $later = $this->makeBatch($product, 70, now()->addDays(90)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 10,
            'batch_id'   => $later->batch_id,
        ])->assertOk();

        $this->assertSame(30, $early->fresh()->quantity, 'An explicit batch must not disturb the earlier one.');
        $this->assertSame(60, $later->fresh()->quantity);
    }

    public function test_stock_out_refuses_to_overdraw_a_named_batch(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 100);
        $batch = $this->makeBatch($product, 5, now()->addDays(30)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 10,
            'batch_id'   => $batch->batch_id,
        ])->assertStatus(422)->assertJsonPath('message', 'Insufficient quantity in specified batch.');

        $this->assertSame(5, $batch->fresh()->quantity);
        $this->assertSame(100, $inventory->fresh()->current_stock);
    }

    public function test_stock_out_refuses_to_overdraw_total_stock(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 8);
        $this->makeBatch($product, 8, now()->addDays(30)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 20,
        ])->assertStatus(422)->assertJsonPath('message', 'Insufficient stock.');

        $this->assertSame(8, $inventory->fresh()->current_stock);
    }

    public function test_stock_out_refuses_when_active_batches_are_short(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 50);

        // Physical stock says 50 but only 10 units sit in live batches.
        $this->makeBatch($product, 10, now()->addDays(30)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 40,
        ])->assertStatus(422)->assertJsonPath('message', 'Insufficient stock in active batches.');

        $this->assertSame(50, $inventory->fresh()->current_stock);
    }

    public function test_a_fully_consumed_batch_is_taken_out_of_the_active_pool(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $this->makeInventory($product, 20);
        $batch = $this->makeBatch($product, 20, now()->addDays(10)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 20,
        ])->assertOk();

        $batch->refresh();

        $this->assertSame(0, $batch->quantity);
        $this->assertSame('cleared', $batch->status);
        $this->assertNotContains($batch->batch_id, FEFOBatch::activeFefo()->pluck('batch_id')->all());
    }

    public function test_stock_out_records_the_override_reason_in_the_audit_log(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $this->makeInventory($product, 40);
        $this->makeBatch($product, 40, now()->addDays(30)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id'      => $product->product_id,
            'quantity'        => 5,
            'override_reason' => 'Customer accepted near-expiry unit.',
        ])->assertOk();

        $this->assertDatabaseHas('Audit_Log', [
            'action' => 'FEFO Override: Stock-out with reason: Customer accepted near-expiry unit.',
        ]);
    }

    // === GET /api/v1/inventory/movements ===

    public function test_movement_history_is_ordered_newest_first(): void
    {
        $user = $this->makeInventoryUser('Inventory');
        Sanctum::actingAs($user);

        $product = $this->makeProduct(['reorder_level' => 20]);
        $this->makeInventory($product, 0);

        $this->postJson('/api/v1/inventory/stock-in', ['product_id' => $product->product_id, 'quantity' => 10])
            ->assertOk();
        $this->postJson('/api/v1/inventory/receive', [
            'product_id'   => $product->product_id,
            'quantity'     => 5,
            'batch_number' => 'LOT-1',
            'expiry_date'  => now()->addMonth()->toDateString(),
        ])->assertOk();

        $response = $this->getJson('/api/v1/inventory/movements');

        $response->assertOk()->assertJsonCount(2, 'data');

        $types = array_column($response->json('data'), 'movement_type');
        $this->assertSame(['Stock In', 'Stock In'], $types);
    }

    public function test_per_inventory_movement_history_is_scoped_to_one_product(): void
    {
        $this->actingAsInventory();

        $a = $this->makeProduct(['reorder_level' => 20]);
        $b = $this->makeProduct(['reorder_level' => 20]);
        $invA = $this->makeInventory($a, 0);
        $this->makeInventory($b, 0);

        $this->postJson('/api/v1/inventory/stock-in', ['product_id' => $a->product_id, 'quantity' => 3])->assertOk();
        $this->postJson('/api/v1/inventory/stock-in', ['product_id' => $b->product_id, 'quantity' => 7])->assertOk();

        $response = $this->getJson("/api/v1/inventory/{$invA->inventory_id}/movements");

        $response->assertOk()
            ->assertJsonPath('product_id', $a->product_id)
            ->assertJsonCount(1, 'movements');
        $this->assertSame(3, $response->json('movements.0.quantity'));
    }

    // === Inventory::calcStatus ===

    public function test_draining_a_product_to_zero_persists_without_a_db_error(): void
    {
        // Inventory.stock_status is an ENUM. calcStatus() returns 'Out of Stock'
        // at zero, so the enum has to accept it or every zero-stock write 500s.
        $this->actingAsInventory();
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 7);
        $this->makeBatch($product, 7, now()->addDays(30)->toDateString());

        $this->postJson('/api/v1/inventory/stock-out', [
            'product_id' => $product->product_id,
            'quantity'   => 7,
        ])->assertOk();

        $this->assertSame(0, $inventory->fresh()->current_stock);
        $this->assertSame('Out of Stock', $inventory->fresh()->stock_status);
    }

    public function test_calc_status_boundaries(): void
    {
        $this->assertSame('Out of Stock', Inventory::calcStatus(0, 20));
        $this->assertSame('Out of Stock', Inventory::calcStatus(-5, 20));
        $this->assertSame('Low Stock', Inventory::calcStatus(20, 20));
        $this->assertSame('Normal', Inventory::calcStatus(21, 20));
        $this->assertSame('Normal', Inventory::calcStatus(100, 20));
        $this->assertSame('Overstock', Inventory::calcStatus(101, 20));
    }
}