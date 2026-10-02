<?php

namespace Tests\Feature\Wastage;

use App\Jobs\WarmAnalyticsCache;
use App\Models\Inventory;
use App\Models\WastageFlag;
use App\Models\WastageRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesInventoryFixtures;
use Tests\TestCase;

/**
 * Wastage has two entry points:
 *
 *   POST /wastage             — Inventory/Owner records loss directly.
 *   POST /wastage-flags       — Cashier flags; Inventory confirms/rejects.
 *
 * Both deduct stock, and both must refuse to drive inventory negative.
 */
class WastageTest extends TestCase
{
    use CreatesInventoryFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Both write paths warm the analytics cache on every call.
        Bus::fake();
    }

    private function actingAsRole(string $role): void
    {
        Sanctum::actingAs($this->makeInventoryUser($role));
    }

    // === POST /api/v1/wastage ===

    public function test_recording_wastage_deducts_stock_and_writes_a_movement(): void
    {
        $this->actingAsRole('Inventory');
        $product = $this->makeProduct(['reorder_level' => 20]);
        $inventory = $this->makeInventory($product, 100);

        $this->postJson('/api/v1/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Expired',
            'quantity'       => 5,
            'estimated_loss' => 50,
            'date_recorded'  => now()->toDateString(),
        ])->assertCreated()->assertJsonPath('message', 'Wastage recorded.');

        $this->assertSame(95, $inventory->fresh()->current_stock);

        $this->assertDatabaseHas('Wastage_Record', [
            'product_id'   => $product->product_id,
            'wastage_type' => 'Expired',
            'quantity'     => 5,
        ]);

        $this->assertDatabaseHas('Stock_Movement', [
            'product_id'    => $product->product_id,
            'movement_type' => 'Stock Out',
            'quantity'      => 5,
            'remarks'       => 'Wastage: Expired',
        ]);
    }

    public function test_recording_wastage_warms_the_analytics_cache(): void
    {
        $this->actingAsRole('Inventory');
        $product = $this->makeProduct();
        $this->makeInventory($product, 10);

        $this->postJson('/api/v1/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Damaged',
            'quantity'       => 1,
            'estimated_loss' => 10,
            'date_recorded'  => now()->toDateString(),
        ])->assertCreated();

        Bus::assertDispatched(WarmAnalyticsCache::class);
    }

    public function test_wastage_is_attributed_to_the_authenticated_user(): void
    {
        $user = $this->makeInventoryUser('Inventory');
        Sanctum::actingAs($user);

        $product = $this->makeProduct();
        $this->makeInventory($product, 10);

        $this->postJson('/api/v1/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Spoiled',
            'quantity'       => 2,
            'estimated_loss' => 20,
            'date_recorded'  => now()->toDateString(),
        ])->assertCreated();

        $this->assertDatabaseHas('Wastage_Record', [
            'product_id' => $product->product_id,
            'user_id'    => $user->User_id,
        ]);
    }

    public function test_wastage_can_be_recorded_against_a_batch(): void
    {
        $this->actingAsRole('Inventory');
        $product = $this->makeProduct();
        $inventory = $this->makeInventory($product, 50);
        $batch = $this->makeBatch($product, 50, now()->addDays(5)->toDateString());

        $this->postJson('/api/v1/wastage', [
            'product_id'     => $product->product_id,
            'batch_id'       => $batch->batch_id,
            'wastage_type'   => 'Expired',
            'quantity'       => 5,
            'estimated_loss' => 50,
            'date_recorded'  => now()->toDateString(),
        ])->assertCreated();

        $this->assertDatabaseHas('Stock_Movement', [
            'batch_id' => $batch->batch_id,
            'product_id' => $product->product_id,
        ]);
        $this->assertSame(45, $inventory->fresh()->current_stock);
    }

    public function test_recording_wastage_refuses_to_overdraw_stock(): void
    {
        $this->actingAsRole('Inventory');
        $product = $this->makeProduct();
        $inventory = $this->makeInventory($product, 3);

        $this->postJson('/api/v1/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Damaged',
            'quantity'       => 10,
            'estimated_loss' => 100,
            'date_recorded'  => now()->toDateString(),
        ])->assertStatus(422);

        $this->assertSame(3, $inventory->fresh()->current_stock);
        $this->assertDatabaseCount('Wastage_Record', 0);
    }

    public function test_wastage_rejects_an_unknown_type(): void
    {
        $this->actingAsRole('Inventory');
        $product = $this->makeProduct();
        $this->makeInventory($product, 10);

        $this->postJson('/api/v1/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Melted',
            'quantity'       => 1,
            'estimated_loss' => 10,
            'date_recorded'  => now()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('wastage_type');
    }

    public function test_recall_and_other_are_accepted_wastage_types(): void
    {
        // wastage_flags.reason allows 'recalled' and 'other'; confirming such a
        // flag writes ucfirst(reason) into Wastage_Record.wastage_type, so the
        // column has to accept Recalled and Other too.
        foreach (['Recalled', 'Other'] as $type) {
            $this->actingAsRole('Inventory');
            $product = $this->makeProduct();
            $this->makeInventory($product, 10);

            $this->postJson('/api/v1/wastage', [
                'product_id'     => $product->product_id,
                'wastage_type'   => $type,
                'quantity'       => 1,
                'estimated_loss' => 10,
                'date_recorded'  => now()->toDateString(),
            ])->assertCreated();

            $this->assertDatabaseHas('Wastage_Record', [
                'product_id'   => $product->product_id,
                'wastage_type' => $type,
            ]);
        }
    }

    public function test_wastage_requires_a_quantity_of_at_least_one(): void
    {
        $this->actingAsRole('Inventory');
        $product = $this->makeProduct();
        $this->makeInventory($product, 10);

        $this->postJson('/api/v1/wastage', [
            'product_id'     => $product->product_id,
            'wastage_type'   => 'Expired',
            'quantity'       => 0,
            'estimated_loss' => 10,
            'date_recorded'  => now()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('quantity');
    }

    // === GET /api/v1/wastage ===

    public function test_wastage_index_is_newest_first(): void
    {
        $this->actingAsRole('Inventory');
        $product = $this->makeProduct();
        $this->makeInventory($product, 100);

        foreach (['Expired' => 3, 'Damaged' => 2] as $type => $daysAgo) {
            WastageRecord::create([
                'product_id'     => $product->product_id,
                'user_id'        => $this->makeInventoryUser('Inventory')->User_id,
                'wastage_type'   => $type,
                'quantity'       => 1,
                'estimated_loss' => 10,
                'date_recorded'  => now()->subDays($daysAgo),
            ]);
        }

        $response = $this->getJson('/api/v1/wastage');

        $response->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame(
            ['Damaged', 'Expired'],
            array_column($response->json('data'), 'wastage_type')
        );
    }

    // === POST /api/v1/wastage-flags ===

    public function test_a_cashier_flag_starts_pending_and_leaves_stock_alone(): void
    {
        $this->actingAsRole('Cashier');
        $product = $this->makeProduct();
        $inventory = $this->makeInventory($product, 100);

        $this->postJson('/api/v1/wastage-flags', [
            'product_id' => $product->product_id,
            'quantity'   => 4,
            'reason'     => 'damaged',
            'notes'      => 'Crushed in the shelf.',
        ])->assertCreated()->assertJsonPath('message', 'Wastage flagged for review.');

        $flag = WastageFlag::firstOrFail();

        $this->assertSame('pending', $flag->status);
        $this->assertNull($flag->reviewed_by);

        // Flagging is only a report — nothing moves until Inventory confirms.
        $this->assertSame(100, $inventory->fresh()->current_stock);
        $this->assertDatabaseCount('Wastage_Record', 0);
    }

    public function test_flag_rejects_an_unknown_reason(): void
    {
        $this->actingAsRole('Cashier');
        $product = $this->makeProduct();
        $this->makeInventory($product, 10);

        $this->postJson('/api/v1/wastage-flags', [
            'product_id' => $product->product_id,
            'quantity'   => 1,
            'reason'     => 'melted',
        ])->assertStatus(422)->assertJsonValidationErrors('reason');
    }

    public function test_a_cashier_without_a_business_can_still_flag(): void
    {
        // User.business_id is nullable and registration never sets it, so a
        // cashier who has not been assigned to a business must still be able to
        // flag — wastage_flags.business_id has to accept NULL.
        $this->actingAsRole('Cashier');
        $product = $this->makeProduct();
        $this->makeInventory($product, 20);

        $this->postJson('/api/v1/wastage-flags', [
            'product_id' => $product->product_id,
            'quantity'   => 1,
            'reason'     => 'damaged',
        ])->assertCreated();

        $this->assertNull(WastageFlag::firstOrFail()->business_id);
    }

    // === POST /api/v1/wastage-flags/{id}/confirm ===

    public function test_confirming_a_flag_records_the_wastage_and_deducts_stock(): void
    {
        $product = $this->makeProduct(['cost_price' => 12.00]);
        $inventory = $this->makeInventory($product, 100);

        $flag = $this->seedFlag($product, quantity: 3, reason: 'expired');

        $this->actingAsRole('Inventory');
        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/confirm")
            ->assertOk()
            ->assertJsonPath('message', 'Wastage confirmed and recorded.');

        $this->assertSame(97, $inventory->fresh()->current_stock);
        $this->assertSame('confirmed', $flag->fresh()->status);

        $this->assertDatabaseHas('Wastage_Record', [
            'product_id'   => $product->product_id,
            'wastage_type' => 'Expired',
            'quantity'     => 3,
            // 3 units at the product's 12.00 cost price.
            'estimated_loss' => 36,
        ]);

        $this->assertDatabaseHas('Stock_Movement', [
            'product_id'    => $product->product_id,
            'movement_type' => 'Wastage',
            'quantity'      => 3,
        ]);
    }

    public function test_confirming_a_recall_flag_persists_a_recall_wastage_type(): void
    {
        // 'recalled' is a valid flag reason but was not a valid wastage_type —
        // confirming such a flag truncated the enum and 500'd.
        $product = $this->makeProduct();
        $this->makeInventory($product, 50);

        $flag = $this->seedFlag($product, quantity: 2, reason: 'recalled');

        $this->actingAsRole('Inventory');
        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/confirm")->assertOk();

        $this->assertDatabaseHas('Wastage_Record', [
            'product_id'   => $product->product_id,
            'wastage_type' => 'Recalled',
        ]);
        $this->assertSame('recall', WastageRecord::firstOrFail()->getClassification());
    }

    public function test_every_flag_reason_maps_to_a_storable_wastage_type(): void
    {
        foreach (['expired', 'damaged', 'recalled', 'spoiled', 'other'] as $reason) {
            $product = $this->makeProduct();
            $this->makeInventory($product, 50);
            $flag = $this->seedFlag($product, quantity: 1, reason: $reason);

            $this->actingAsRole('Inventory');
            $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/confirm")->assertOk();

            $this->assertDatabaseHas('Wastage_Record', [
                'wastage_type' => ucfirst($reason),
            ]);
        }
    }

    public function test_confirming_refuses_to_overdraw_stock(): void
    {
        $product = $this->makeProduct();
        $inventory = $this->makeInventory($product, 2);
        $flag = $this->seedFlag($product, quantity: 10, reason: 'damaged');

        $this->actingAsRole('Inventory');
        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/confirm")->assertStatus(422);

        $this->assertSame('pending', $flag->fresh()->status, 'A failed confirm must leave the flag pending.');
        $this->assertSame(2, $inventory->fresh()->current_stock);
        $this->assertDatabaseCount('Wastage_Record', 0);
    }

    public function test_a_flag_cannot_be_confirmed_twice(): void
    {
        $product = $this->makeProduct();
        $this->makeInventory($product, 100);
        $flag = $this->seedFlag($product, quantity: 2, reason: 'expired');

        $this->actingAsRole('Inventory');

        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/confirm")->assertOk();
        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/confirm")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Flag already processed.');

        // Exactly one deduction, not two.
        $this->assertDatabaseCount('Wastage_Record', 1);
        $this->assertDatabaseCount('Stock_Movement', 1);
    }

    // === POST /api/v1/wastage-flags/{id}/reject ===

    public function test_rejecting_a_flag_records_the_reason_and_keeps_the_stock(): void
    {
        $product = $this->makeProduct();
        $inventory = $this->makeInventory($product, 100);
        $flag = $this->seedFlag($product, quantity: 5, reason: 'other');

        $this->actingAsRole('Inventory');
        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/reject", [
            'rejection_reason' => 'Product was fine — mis-scan.',
        ])->assertOk()->assertJsonPath('message', 'Wastage flag rejected.');

        $flag->refresh();

        $this->assertSame('rejected', $flag->status);
        $this->assertSame('Product was fine — mis-scan.', $flag->rejection_reason);
        $this->assertNotNull($flag->reviewed_at);

        $this->assertSame(100, $inventory->fresh()->current_stock);
        $this->assertDatabaseCount('Wastage_Record', 0);
    }

    public function test_rejecting_requires_a_reason(): void
    {
        $product = $this->makeProduct();
        $this->makeInventory($product, 100);
        $flag = $this->seedFlag($product, quantity: 1, reason: 'damaged');

        $this->actingAsRole('Inventory');
        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rejection_reason');

        $this->assertSame('pending', $flag->fresh()->status);
    }

    public function test_a_rejected_flag_can_no_longer_be_confirmed(): void
    {
        $product = $this->makeProduct();
        $this->makeInventory($product, 100);
        $flag = $this->seedFlag($product, quantity: 1, reason: 'damaged');

        $this->actingAsRole('Inventory');
        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/reject", [
            'rejection_reason' => 'Not damaged.',
        ])->assertOk();

        $this->postJson("/api/v1/wastage-flags/{$flag->flag_id}/confirm")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Flag already processed.');
    }

    // === GET /api/v1/wastage-flags ===

    public function test_flags_can_be_filtered_by_status(): void
    {
        $product = $this->makeProduct();
        $this->makeInventory($product, 100);

        $pending = $this->seedFlag($product, quantity: 1, reason: 'damaged');
        $confirmed = $this->seedFlag($product, quantity: 1, reason: 'expired');

        $this->actingAsRole('Inventory');
        $this->postJson("/api/v1/wastage-flags/{$confirmed->flag_id}/confirm")->assertOk();

        $response = $this->getJson('/api/v1/wastage-flags?status=pending');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($pending->flag_id, $response->json('data.0.id'));
    }

    // === WastageRecord::getClassification ===

    public function test_get_classification_maps_every_wastage_type(): void
    {
        $expected = [
            'Expired'  => 'expiry',
            'Damaged'  => 'physical',
            'Spoiled'  => 'quality',
            'Lost'     => 'shrinkage',
            'Recalled' => 'recall',
            'Other'    => 'other',
        ];

        foreach ($expected as $type => $classification) {
            $record = new WastageRecord(['wastage_type' => $type]);
            $this->assertSame($classification, $record->getClassification(), "wastage_type {$type}");
        }
    }

    // === Helpers ===

    /**
     * wastage_flags.business_id / branch_id are NOT NULL FKs, and confirm()
     * copies both onto the Wastage_Record it writes. The acting users leave
     * business_id / branch_id null, so seed the parents directly.
     */
    private function seedFlag($product, int $quantity, string $reason): WastageFlag
    {
        return WastageFlag::create([
            'business_id' => $this->makeBusiness()->id,
            'branch_id'   => $this->makeBranch()->id,
            'product_id'  => $product->product_id,
            'quantity'    => $quantity,
            'reason'      => $reason,
            'flagged_by'  => $this->makeInventoryUser('Cashier')->User_id,
            'status'      => 'pending',
        ]);
    }
}