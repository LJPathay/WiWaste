<?php

namespace Tests\Unit\Policies;

use App\Models\SalesTransaction;
use App\Models\User;
use App\Models\WastageRecord;
use App\Policies\CashierPolicy;
use App\Policies\InventoryPolicy;
use App\Policies\SalesPolicy;
use App\Policies\WastagePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::factory()->role($role)->create();
    }

    /** Stand-in for a domain model — the policies only ever compare role + owner. */
    private function wastageRecord(): WastageRecord
    {
        $record = new WastageRecord;
        $record->id = 1;

        return $record;
    }

    // === SalesPolicy ===

    public function test_sales_view_any_is_owner_and_cashier_only(): void
    {
        $policy = new SalesPolicy;

        $this->assertTrue($policy->viewAny($this->user('Owner')));
        $this->assertTrue($policy->viewAny($this->user('Cashier')));
        $this->assertFalse($policy->viewAny($this->user('Inventory')));
    }

    public function test_sales_create_is_owner_and_cashier_only(): void
    {
        $policy = new SalesPolicy;

        $this->assertTrue($policy->create($this->user('Owner')));
        $this->assertTrue($policy->create($this->user('Cashier')));
        $this->assertFalse($policy->create($this->user('Inventory')));
    }

    public function test_cashier_may_view_a_sale_they_own(): void
    {
        $cashier = $this->user('Cashier');
        $sale = new SalesTransaction;
        $sale->user_id = $cashier->User_id;

        $this->assertTrue((new SalesPolicy)->view($cashier, $sale));
        $this->assertTrue((new SalesPolicy)->viewOwn($cashier, $sale));
    }

    public function test_cashier_may_not_view_another_cashiers_sale(): void
    {
        $cashier = $this->user('Cashier');
        $other = $this->user('Cashier');

        $sale = new SalesTransaction;
        $sale->user_id = $other->User_id;

        $this->assertFalse((new SalesPolicy)->view($cashier, $sale));
        $this->assertFalse((new SalesPolicy)->viewOwn($cashier, $sale));
    }

    public function test_owner_may_view_any_sale(): void
    {
        $owner = $this->user('Owner');
        $sale = new SalesTransaction;
        $sale->user_id = $this->user('Cashier')->User_id;

        $policy = new SalesPolicy;
        $this->assertTrue($policy->view($owner, $sale));
        $this->assertTrue($policy->viewOwn($owner, $sale));
    }

    public function test_inventory_may_not_view_a_sale(): void
    {
        $inventory = $this->user('Inventory');
        $sale = new SalesTransaction;
        $sale->user_id = $inventory->User_id;

        $this->assertFalse((new SalesPolicy)->view($inventory, $sale));
    }

    public function test_refund_and_void_are_owner_only(): void
    {
        $policy = new SalesPolicy;
        $sale = new SalesTransaction;

        $this->assertTrue($policy->refund($this->user('Owner'), $sale));
        $this->assertFalse($policy->refund($this->user('Cashier'), $sale));
        $this->assertFalse($policy->refund($this->user('Inventory'), $sale));

        $this->assertTrue($policy->void($this->user('Owner'), $sale));
        $this->assertFalse($policy->void($this->user('Cashier'), $sale));
    }

    // === InventoryPolicy ===

    public function test_inventory_view_any_excludes_cashier(): void
    {
        $policy = new InventoryPolicy;

        $this->assertTrue($policy->viewAny($this->user('Owner')));
        $this->assertTrue($policy->viewAny($this->user('Inventory')));
        $this->assertFalse($policy->viewAny($this->user('Cashier')));
    }

    public function test_stock_movements_belong_to_owner_and_inventory(): void
    {
        $policy = new InventoryPolicy;

        foreach (['stockIn', 'stockOut', 'adjust', 'export'] as $ability) {
            $this->assertTrue($policy->{$ability}($this->user('Owner')), "owner should {$ability}");
            $this->assertTrue($policy->{$ability}($this->user('Inventory')), "inventory should {$ability}");
            $this->assertFalse($policy->{$ability}($this->user('Cashier')), "cashier should not {$ability}");
        }
    }

    // === WastagePolicy ===

    public function test_wastage_view_any_excludes_cashier(): void
    {
        $policy = new WastagePolicy;

        $this->assertTrue($policy->viewAny($this->user('Owner')));
        $this->assertTrue($policy->viewAny($this->user('Inventory')));
        $this->assertFalse($policy->viewAny($this->user('Cashier')));
    }

    public function test_wastage_create_is_owner_and_inventory(): void
    {
        $policy = new WastagePolicy;

        $this->assertTrue($policy->create($this->user('Owner')));
        $this->assertTrue($policy->create($this->user('Inventory')));
        $this->assertFalse($policy->create($this->user('Cashier')));
    }

    public function test_only_owner_can_approve(): void
    {
        $policy = new WastagePolicy;
        $record = $this->wastageRecord();

        $this->assertTrue($policy->approve($this->user('Owner'), $record));
        $this->assertFalse($policy->approve($this->user('Inventory'), $record));
        $this->assertFalse($policy->approve($this->user('Cashier'), $record));
    }

    public function test_any_staff_member_may_flag_but_only_owner_or_inventory_may_confirm(): void
    {
        $policy = new WastagePolicy;

        $this->assertTrue($policy->flag($this->user('Owner')));
        $this->assertTrue($policy->flag($this->user('Inventory')));
        $this->assertTrue($policy->flag($this->user('Cashier')));

        $this->assertTrue($policy->confirm($this->user('Owner')));
        $this->assertTrue($policy->confirm($this->user('Inventory')));
        $this->assertFalse($policy->confirm($this->user('Cashier')));
    }

    public function test_wastage_edit_is_owner_only(): void
    {
        $policy = new WastagePolicy;

        $this->assertTrue($policy->edit($this->user('Owner')));
        $this->assertFalse($policy->edit($this->user('Inventory')));
    }

    public function test_wastage_delete_is_owner_only(): void
    {
        $policy = new WastagePolicy;

        $this->assertTrue($policy->delete($this->user('Owner')));
        $this->assertFalse($policy->delete($this->user('Inventory')));
    }

    // === CashierPolicy ===

    public function test_pos_access_is_cashier_and_owner(): void
    {
        $policy = new CashierPolicy;

        $this->assertTrue($policy->posAccess($this->user('Cashier')));
        $this->assertTrue($policy->posAccess($this->user('Owner')));
        $this->assertFalse($policy->posAccess($this->user('Inventory')));
    }

    public function test_cashier_policy_sale_create_is_cashier_and_owner(): void
    {
        $policy = new CashierPolicy;

        $this->assertTrue($policy->saleCreate($this->user('Cashier')));
        $this->assertTrue($policy->saleCreate($this->user('Owner')));
        $this->assertFalse($policy->saleCreate($this->user('Inventory')));
    }

    public function test_cashier_policy_scopes_sale_view_to_the_owner_of_the_sale(): void
    {
        $policy = new CashierPolicy;
        $cashier = $this->user('Cashier');
        $other = $this->user('Cashier');
        $owner = $this->user('Owner');

        $ownSale = new SalesTransaction;
        $ownSale->user_id = $cashier->User_id;

        $otherSale = new SalesTransaction;
        $otherSale->user_id = $other->User_id;

        $this->assertTrue($policy->saleViewOwn($cashier, $ownSale));
        $this->assertFalse($policy->saleViewOwn($cashier, $otherSale));
        $this->assertTrue($policy->saleViewOwn($owner, $otherSale));
    }

    public function test_receipt_print_is_cashier_and_owner(): void
    {
        $policy = new CashierPolicy;

        $this->assertTrue($policy->receiptPrint($this->user('Cashier')));
        $this->assertTrue($policy->receiptPrint($this->user('Owner')));
        $this->assertFalse($policy->receiptPrint($this->user('Inventory')));
    }
}
