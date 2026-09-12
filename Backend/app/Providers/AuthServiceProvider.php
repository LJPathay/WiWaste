<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\User;
use App\Policies\InventoryPolicy;
use App\Policies\ProductPolicy;
use App\Policies\PurchaseOrderPolicy;
use App\Policies\SalesPolicy;
use App\Policies\WastagePolicy;
use App\Policies\UserPolicy;
use App\Policies\ReportPolicy;
use App\Policies\SettingsPolicy;
use App\Policies\FEFOPolicy;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        \App\Models\Inventory::class => InventoryPolicy::class,
        \App\Models\Product::class => ProductPolicy::class,
        \App\Models\PurchaseOrder::class => PurchaseOrderPolicy::class,
        \App\Models\SalesTransaction::class => SalesPolicy::class,
        \App\Models\WastageRecord::class => WastagePolicy::class,
        \App\Models\User::class => UserPolicy::class,
        \App\Models\FEFOPolicy::class => FEFOPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        // ── Inventory gates ──
        Gate::define('inventory.viewAny', [InventoryPolicy::class, 'viewAny']);
        Gate::define('inventory.view', [InventoryPolicy::class, 'view']);
        Gate::define('inventory.stockIn', [InventoryPolicy::class, 'stockIn']);
        Gate::define('inventory.stockOut', [InventoryPolicy::class, 'stockOut']);
        Gate::define('inventory.adjust', [InventoryPolicy::class, 'adjust']);
        Gate::define('inventory.export', [InventoryPolicy::class, 'export']);

        // ── Product gates ──
        Gate::define('product.viewAny', [ProductPolicy::class, 'viewAny']);
        Gate::define('product.view', [ProductPolicy::class, 'view']);
        Gate::define('product.create', [ProductPolicy::class, 'create']);
        Gate::define('product.update', [ProductPolicy::class, 'update']);
        Gate::define('product.delete', [ProductPolicy::class, 'delete']);
        Gate::define('product.manageCategories', [ProductPolicy::class, 'manageCategories']);

        // ── Purchase Order gates ──
        Gate::define('purchaseOrder.viewAny', [PurchaseOrderPolicy::class, 'viewAny']);
        Gate::define('purchaseOrder.view', [PurchaseOrderPolicy::class, 'view']);
        Gate::define('purchaseOrder.create', [PurchaseOrderPolicy::class, 'create']);
        Gate::define('purchaseOrder.update', [PurchaseOrderPolicy::class, 'update']);
        Gate::define('purchaseOrder.receive', [PurchaseOrderPolicy::class, 'receive']);
        Gate::define('purchaseOrder.cancel', [PurchaseOrderPolicy::class, 'cancel']);

        // ── Sales gates ──
        Gate::define('sales.viewAny', [SalesPolicy::class, 'viewAny']);
        Gate::define('sales.view', [SalesPolicy::class, 'view']);
        Gate::define('sales.create', [SalesPolicy::class, 'create']);
        Gate::define('sales.refund', [SalesPolicy::class, 'refund']);
        Gate::define('sales.void', [SalesPolicy::class, 'void']);

        // ── Wastage gates ──
        Gate::define('wastage.viewAny', [WastagePolicy::class, 'viewAny']);
        Gate::define('wastage.view', [WastagePolicy::class, 'view']);
        Gate::define('wastage.create', [WastagePolicy::class, 'create']);
        Gate::define('wastage.approve', [WastagePolicy::class, 'approve']);

        // ── User gates ──
        Gate::define('user.viewAny', [UserPolicy::class, 'viewAny']);
        Gate::define('user.view', [UserPolicy::class, 'view']);
        Gate::define('user.create', [UserPolicy::class, 'create']);
        Gate::define('user.update', [UserPolicy::class, 'update']);
        Gate::define('user.delete', [UserPolicy::class, 'delete']);
        Gate::define('user.quarantine', [UserPolicy::class, 'quarantine']);

        // ── Report gates ──
        Gate::define('report.viewAny', [ReportPolicy::class, 'viewAny']);
        Gate::define('report.generate', [ReportPolicy::class, 'generate']);
        Gate::define('report.export', [ReportPolicy::class, 'export']);

        // ── Settings gates ──
        Gate::define('settings.view', [SettingsPolicy::class, 'view']);
        Gate::define('settings.update', [SettingsPolicy::class, 'update']);

        // ── FEFO gates ──
        Gate::define('fefo.viewAny', [FEFOPolicy::class, 'viewAny']);
        Gate::define('fefo.view', [FEFOPolicy::class, 'view']);
        Gate::define('fefo.flag', [FEFOPolicy::class, 'flag']);
        Gate::define('fefo.clear', [FEFOPolicy::class, 'clear']);
        Gate::define('fefo.notify', [FEFOPolicy::class, 'notify']);

        // ── Super-admin bypass ──
        Gate::before(function (User $user) {
            if ($user->role === 'Admin') {
                return true;
            }
        });
    }
}
