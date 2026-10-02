<?php

namespace Tests\Feature\Inventory;

use App\Models\AuditLog;
use App\Models\FEFOBatch;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesInventoryFixtures;
use Tests\TestCase;

class FefoTest extends TestCase
{
    use CreatesInventoryFixtures, RefreshDatabase;

    private function actingAsInventory(): void
    {
        Sanctum::actingAs($this->makeInventoryUser('Inventory'));
    }

    // === GET /api/v1/fefo/batches ===

    public function test_batches_are_listed_earliest_expiry_first(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();

        $this->makeBatch($product, 40, now()->addDays(60)->toDateString());
        $this->makeBatch($product, 25, now()->addDays(3)->toDateString());
        $this->makeBatch($product, 10, now()->addDays(10)->toDateString());

        $response = $this->getJson('/api/v1/fefo/batches');

        $response->assertOk()
            ->assertJsonPath('total_batches', 3)
            ->assertJsonPath('critical_count', 1)
            ->assertJsonPath('expiring_soon_count', 1);

        $dates = array_column($response->json('batches'), 'expiry_date');
        $sorted = $dates;
        sort($sorted);

        $this->assertSame($sorted, $dates, 'Batches must be ordered by expiry date ascending.');
    }

    public function test_critical_and_expiring_soon_counts_exclude_non_active_batches(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();

        // Inside the 7-day critical window but already flagged.
        $this->makeBatch($product, 5, now()->addDays(3)->toDateString(), ['status' => 'flagged']);
        // Genuinely critical.
        $this->makeBatch($product, 5, now()->addDays(5)->toDateString());

        $response = $this->getJson('/api/v1/fefo/batches');

        $response->assertOk()
            ->assertJsonPath('critical_count', 1)
            ->assertJsonPath('total_batches', 2);
    }

    public function test_batch_detail_includes_downstream_movements(): void
    {
        $user = $this->makeInventoryUser('Inventory');
        Sanctum::actingAs($user);

        $product = $this->makeProduct();
        $batch = $this->makeBatch($product, 50, now()->addDays(45)->toDateString(), ['created_by' => $user->User_id]);

        StockMovement::create([
            'product_id'    => $product->product_id,
            'batch_id'      => $batch->batch_id,
            'user_id'       => $user->User_id,
            'movement_type' => 'Stock Out',
            'quantity'      => 5,
            'movement_date' => now(),
        ]);

        $this->getJson("/api/v1/fefo/batches/{$batch->batch_id}")
            ->assertOk()
            ->assertJsonPath('batch_id', $batch->batch_id)
            ->assertJsonPath('quantity', 50)
            ->assertJsonCount(1, 'movements');
    }

    // === GET /api/v1/fefo/batches/{id}/trace ===

    public function test_trace_returns_the_supplier_upstream_and_movements_downstream(): void
    {
        $user = $this->makeInventoryUser('Inventory');
        Sanctum::actingAs($user);

        $supplier = $this->makeSupplier('Unilab Philippines');
        $product = $this->makeProduct(['supplier_id' => $supplier->supplier_id]);
        $batch = $this->makeBatch($product, 30, now()->addDays(90)->toDateString(), [
            'supplier_batch_number' => 'SB-9911',
        ]);

        StockMovement::create([
            'product_id'    => $product->product_id,
            'batch_id'      => $batch->batch_id,
            'user_id'       => $user->User_id,
            'movement_type' => 'Stock Out',
            'quantity'      => 2,
            'movement_date' => now(),
        ]);

        $response = $this->getJson("/api/v1/fefo/batches/{$batch->batch_id}/trace");

        $response->assertOk()
            ->assertJsonPath('batch.batch_number', $batch->batch_number)
            ->assertJsonPath('batch.supplier_batch_number', 'SB-9911');

        $this->assertNotEmpty($response->json('upstream'), 'Supplier must appear in the upstream trace.');
        $this->assertCount(1, $response->json('downstream'));
    }

    // === POST /api/v1/fefo/apply ===

    public function test_apply_flags_a_batch_and_records_the_directive(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();
        $batch = $this->makeBatch($product, 10, now()->addDays(4)->toDateString());

        $this->postJson('/api/v1/fefo/apply', [
            'batch_id'        => $batch->batch_id,
            'action'          => 'flag',
            'directive_notes' => 'Cold chain broken on arrival.',
        ])->assertOk()->assertJsonPath('batch.status', 'flagged');

        $batch->refresh();

        $this->assertSame('flagged', $batch->status);
        $this->assertSame('Cold chain broken on arrival.', $batch->directive_notes);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('directiveStatusProvider')]
    public function test_each_directive_maps_to_its_own_status(string $action, string $expected): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();
        $batch = $this->makeBatch($product, 10, now()->addDays(20)->toDateString());

        $this->postJson('/api/v1/fefo/apply', [
            'batch_id' => $batch->batch_id,
            'action'   => $action,
        ])->assertOk();

        $this->assertSame($expected, $batch->fresh()->status);
    }

    public static function directiveStatusProvider(): array
    {
        return [
            'flag'   => ['flag', 'flagged'],
            'clear'  => ['clear', 'cleared'],
            'notify' => ['notify', 'active'],
        ];
    }

    public function test_apply_writes_an_audit_log_entry(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();
        $batch = $this->makeBatch($product, 10, now()->addDays(12)->toDateString());

        $this->postJson('/api/v1/fefo/apply', [
            'batch_id' => $batch->batch_id,
            'action'   => 'flag',
        ])->assertOk();

        $this->assertDatabaseHas('Audit_Log', [
            'entity_type' => 'FEFO_Batch',
            'entity_id'   => $batch->batch_id,
        ]);
    }

    public function test_apply_rejects_an_unknown_action(): void
    {
        $this->actingAsInventory();
        $product = $this->makeProduct();
        $batch = $this->makeBatch($product, 10, now()->addDays(12)->toDateString());

        $this->postJson('/api/v1/fefo/apply', [
            'batch_id' => $batch->batch_id,
            'action'   => 'destroy',
        ])->assertStatus(422)->assertJsonValidationErrors('action');

        $this->assertSame('active', $batch->fresh()->status);
    }

    public function test_apply_requires_a_known_batch(): void
    {
        $this->actingAsInventory();

        $this->postJson('/api/v1/fefo/apply', [
            'batch_id' => 999999,
            'action'   => 'flag',
        ])->assertStatus(422)->assertJsonValidationErrors('batch_id');
    }

    // === Model scopes ===

    public function test_active_fefo_scope_returns_only_live_batches_in_expiry_order(): void
    {
        $product = $this->makeProduct();

        $soon = $this->makeBatch($product, 5, now()->addDays(5)->toDateString());
        $later = $this->makeBatch($product, 5, now()->addDays(50)->toDateString());
        $this->makeBatch($product, 5, now()->addDays(2)->toDateString(), ['status' => 'flagged']);
        $this->makeBatch($product, 5, now()->addDays(3)->toDateString(), ['quantity' => 0]);

        $result = FEFOBatch::activeFefo()
            ->where('product_id', $product->product_id)
            ->pluck('batch_id')
            ->all();

        $this->assertSame([$soon->batch_id, $later->batch_id], $result);
    }

    public function test_depleted_batches_drop_out_of_the_active_scope(): void
    {
        $product = $this->makeProduct();
        $batch = $this->makeBatch($product, 5, now()->addDays(5)->toDateString());

        $this->assertContains($batch->batch_id, FEFOBatch::activeFefo()->pluck('batch_id')->all());

        $batch->update(['quantity' => 0, 'status' => 'cleared']);

        $this->assertNotContains($batch->batch_id, FEFOBatch::activeFefo()->pluck('batch_id')->all());
    }
}