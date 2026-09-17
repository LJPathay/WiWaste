<?php

namespace App\Jobs;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\FEFOBatch;
use App\Models\StockMovement;
use App\Models\WastageRecord;
use App\Models\SalesTransaction;
use App\Models\User;
use App\Models\Supplier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class WarmAnalyticsCache implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        Cache::forget('dashboard.overview');
        Cache::remember('dashboard.overview', 300, fn () => $this->buildDashboardOverview());

        Cache::forget('analytics.dashboard_summary');
        Cache::remember('analytics.dashboard_summary', 300, fn () => $this->buildDashboardSummary());
    }

    protected function buildDashboardOverview(): array
    {
        $today = now()->startOfDay();
        $lastMonth = now()->subMonth()->startOfMonth();
        $thisMonth = now()->startOfMonth();

        $salesThisMonth = SalesTransaction::where('status', 'Completed')
            ->where('transaction_date', '>=', $thisMonth)
            ->sum('total_amount');
        $salesLastMonth = SalesTransaction::where('status', 'Completed')
            ->where('transaction_date', '>=', $lastMonth)
            ->where('transaction_date', '<', $thisMonth)
            ->sum('total_amount');

        $cogsThisMonth = $this->calculateCogs($thisMonth);
        $cogsLastMonth = $this->calculateCogs($lastMonth, $thisMonth);

        $wastageThisMonth = WastageRecord::where('date_recorded', '>=', $thisMonth)->sum('estimated_loss');
        $wastageLastMonth = WastageRecord::where('date_recorded', '>=', $lastMonth)
            ->where('date_recorded', '<', $thisMonth)->sum('estimated_loss');

        $inventoryValue = DB::select("
            SELECT COALESCE(SUM(i.current_stock * p.cost_price), 0) as total
            FROM Inventory i
            JOIN Product p ON i.product_id = p.product_id
            WHERE p.status = 'Active'
        ");

        $grossProfitThisMonth = (float) $salesThisMonth - (float) ($cogsThisMonth ?? 0);
        $grossProfitLastMonth = (float) $salesLastMonth - (float) ($cogsLastMonth ?? 0);

        return [
            'active_skus' => Product::where('status', 'Active')->count(),
            'total_users' => User::count(),
            'active_suppliers' => Supplier::count(),
            'today_sales' => (float) SalesTransaction::where('status', 'Completed')
                ->whereDate('transaction_date', $today)->sum('total_amount'),
            'recent_wastage' => (float) WastageRecord::whereDate('date_recorded', '>=', now()->subDays(7))
                ->sum('estimated_loss'),
            'sales_this_month' => (float) $salesThisMonth,
            'sales_last_month' => (float) $salesLastMonth,
            'gross_profit_this_month' => $grossProfitThisMonth,
            'gross_profit_last_month' => $grossProfitLastMonth,
            'wastage_this_month' => (float) $wastageThisMonth,
            'wastage_last_month' => (float) $wastageLastMonth,
            'inventory_value' => (float) ($inventoryValue[0]->total ?? 0),
            'critical_fefo_count' => $this->countExpiringBatches(7),
            'high_risk_fefo_count' => $this->countExpiringBatches(15, 8),
        ];
    }

    protected function buildDashboardSummary(): array
    {
        return [
            'low_stock_count'       => Inventory::where('stock_status', 'Low Stock')->count(),
            'expiring_soon_count'   => Product::whereNotNull('expiration_date')
                ->where('expiration_date', '>=', now())
                ->where('expiration_date', '<=', now()->addDays(30))
                ->count(),
            'today_movements'       => StockMovement::whereDate('movement_date', today())->count(),
            'pending_wastage_count' => WastageRecord::whereDate('date_recorded', today())->count(),
            'critical_fefo_count'   => $this->countExpiringBatches(7),
        ];
    }

    protected function calculateCogs($from, $to = null): float
    {
        $sql = "SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) as total
                FROM Sales_Item si
                JOIN Sales_Transaction st ON si.transaction_id = st.transaction_id
                JOIN Product p ON si.product_id = p.product_id
                WHERE st.status = 'Completed' AND st.transaction_date >= ?";

        $params = [$from];
        if ($to) {
            $sql .= " AND st.transaction_date < ?";
            $params[] = $to;
        }

        $result = DB::select($sql, $params);
        return (float) ($result[0]->total ?? 0);
    }

    protected function countExpiringBatches(int $days, int $startOffset = 0): int
    {
        $query = FEFOBatch::where('status', 'active')
            ->where('expiry_date', '>=', now()->addDays($startOffset))
            ->where('expiry_date', '<=', now()->addDays($days));

        return $query->count();
    }
}
