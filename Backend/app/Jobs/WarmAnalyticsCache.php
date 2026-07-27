<?php

namespace App\Jobs;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\FEFOBatch;
use App\Models\StockMovement;
use App\Models\WastageRecord;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;

class WarmAnalyticsCache implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        Cache::forget('dashboard.overview');
        Cache::remember('dashboard.overview', 300, function () {
            return [
                'active_skus' => Product::where('status', 'Active')->count(),
                'total_users' => \App\Models\User::count(),
                'active_suppliers' => \App\Models\Supplier::count(),
                'today_sales' => (float) \App\Models\SalesTransaction::where('status', 'Completed')
                    ->whereDate('transaction_date', today())
                    ->sum('total_amount'),
                'recent_wastage' => (float) WastageRecord::whereDate('date_recorded', '>=', now()->subDays(7))
                    ->sum('estimated_loss'),
            ];
        });

        Cache::forget('analytics.dashboard_summary');
        Cache::remember('analytics.dashboard_summary', 300, function () {
            return [
                'low_stock_count'       => Inventory::where('stock_status', 'Low Stock')->count(),
                'expiring_soon_count'   => Product::whereNotNull('expiration_date')
                    ->where('expiration_date', '>=', now())
                    ->where('expiration_date', '<=', now()->addDays(30))
                    ->count(),
                'today_movements'       => StockMovement::whereDate('movement_date', today())->count(),
                'pending_wastage_count' => WastageRecord::whereDate('date_recorded', today())->count(),
                'critical_fefo_count'   => FEFOBatch::where('status', 'active')
                    ->where('expiry_date', '>=', now())
                    ->where('expiry_date', '<=', now()->addDays(7))
                    ->count(),
            ];
        });
    }
}
