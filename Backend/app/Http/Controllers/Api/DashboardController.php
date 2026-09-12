<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Models\Supplier;
use App\Models\SalesTransaction;
use App\Models\WastageRecord;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function overview()
    {
        $data = Cache::remember('dashboard.overview', 300, function () {
            $today = now()->startOfDay();
            $lastMonth = now()->subMonth()->startOfMonth();
            $thisMonth = now()->startOfMonth();

            // Sales
            $salesThisMonth = SalesTransaction::where('status', 'Completed')
                ->where('transaction_date', '>=', $thisMonth)
                ->sum('total_amount');
            $salesLastMonth = SalesTransaction::where('status', 'Completed')
                ->where('transaction_date', '>=', $lastMonth)
                ->where('transaction_date', '<', $thisMonth)
                ->sum('total_amount');

            // COGS (from sales items + product cost)
            $cogsThisMonth = DB::select("
                SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) as total
                FROM Sales_Item si
                JOIN Sales_Transaction st ON si.transaction_id = st.transaction_id
                JOIN Product p ON si.product_id = p.product_id
                WHERE st.status = 'Completed'
                  AND st.transaction_date >= ?
            ", [$thisMonth]);

            $cogsLastMonth = DB::select("
                SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) as total
                FROM Sales_Item si
                JOIN Sales_Transaction st ON si.transaction_id = st.transaction_id
                JOIN Product p ON si.product_id = p.product_id
                WHERE st.status = 'Completed'
                  AND st.transaction_date >= ?
                  AND st.transaction_date < ?
            ", [$lastMonth, $thisMonth]);

            // Wastage
            $wastageThisMonth = WastageRecord::where('date_recorded', '>=', $thisMonth)->sum('estimated_loss');
            $wastageLastMonth = WastageRecord::where('date_recorded', '>=', $lastMonth)
                ->where('date_recorded', '<', $thisMonth)->sum('estimated_loss');

            // Inventory Value
            $inventoryValue = DB::select("
                SELECT COALESCE(SUM(i.current_stock * p.cost_price), 0) as total
                FROM Inventory i
                JOIN Product p ON i.product_id = p.product_id
                WHERE p.status = 'Active'
            ");

            $grossProfitThisMonth = (float) $salesThisMonth - (float) ($cogsThisMonth[0]->total ?? 0);
            $grossProfitLastMonth = (float) $salesLastMonth - (float) ($cogsLastMonth[0]->total ?? 0);

            return [
                // Existing fields
                'active_skus' => Product::where('status', 'Active')->count(),
                'total_users' => User::count(),
                'active_suppliers' => Supplier::count(),
                'today_sales' => (float) SalesTransaction::where('status', 'Completed')
                    ->whereDate('transaction_date', $today)->sum('total_amount'),
                'recent_wastage' => (float) WastageRecord::whereDate('date_recorded', '>=', now()->subDays(7))
                    ->sum('estimated_loss'),

                // Business Health KPIs
                'sales_this_month' => (float) $salesThisMonth,
                'sales_last_month' => (float) $salesLastMonth,
                'gross_profit_this_month' => $grossProfitThisMonth,
                'gross_profit_last_month' => $grossProfitLastMonth,
                'wastage_this_month' => (float) $wastageThisMonth,
                'wastage_last_month' => (float) $wastageLastMonth,
                'inventory_value' => (float) ($inventoryValue[0]->total ?? 0),

                // Risk counts
                'critical_fefo_count' => DB::table('FEFO_Batch')
                    ->where('status', 'active')
                    ->where('expiry_date', '>=', now())
                    ->where('expiry_date', '<=', now()->addDays(7))
                    ->count(),
                'high_risk_fefo_count' => DB::table('FEFO_Batch')
                    ->where('status', 'active')
                    ->where('expiry_date', '>', now()->addDays(7))
                    ->where('expiry_date', '<=', now()->addDays(15))
                    ->count(),
            ];
        });

        return response()->json($data);
    }

    /**
     * Owner Dashboard Analytics — sales/wastage trends, leakage, inventory health.
     * GET /api/dashboard/owner-analytics
     */
    public function ownerAnalytics(Request $request)
    {
        $period = $request->input('period', '30');
        $days = (int) $period;
        $startDate = now()->subDays($days);

        // Sales trend
        $salesTrend = SalesTransaction::where('status', 'Completed')
            ->where('transaction_date', '>=', $startDate)
            ->select(
                DB::raw('DATE(transaction_date) as date'),
                DB::raw('SUM(total_amount) as value')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Wastage trend
        $wastageTrend = WastageRecord::where('date_recorded', '>=', $startDate)
            ->select(
                DB::raw('DATE(date_recorded) as date'),
                DB::raw('SUM(estimated_loss) as value')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Leakage by category
        $leakageByCategory = DB::select("
            SELECT
                c.category_name as category,
                COALESCE(SUM(w.estimated_loss), 0) as value,
                COALESCE(SUM(w.quantity), 0) as quantity
            FROM Wastage_Record w
            JOIN Product p ON w.product_id = p.product_id
            JOIN Category c ON p.category_id = c.category_id
            WHERE w.date_recorded >= ?
            GROUP BY c.category_id, c.category_name
            ORDER BY value DESC
        ", [$startDate]);

        $totalLeakage = array_sum(array_column($leakageByCategory, 'value'));
        foreach ($leakageByCategory as &$item) {
            $item->percentage = $totalLeakage > 0 ? round(($item->value / $totalLeakage) * 100, 1) : 0;
        }
        unset($item);

        // Inventory health
        $inventoryHealth = [
            'healthy' => Inventory::where('stock_status', 'Normal')->count(),
            'low_stock' => Inventory::where('stock_status', 'Low Stock')->count(),
            'overstock' => Inventory::where('stock_status', 'Overstock')->count(),
            'expiring_soon' => DB::table('FEFO_Batch')
                ->where('status', 'active')
                ->where('expiry_date', '>=', now())
                ->where('expiry_date', '<=', now()->addDays(30))
                ->count(),
            'expired' => DB::table('FEFO_Batch')
                ->where('expiry_date', '<', now())
                ->count(),
        ];

        // Top wasted products
        $topWastedProducts = DB::select("
            SELECT
                w.product_id,
                p.product_name as name,
                COALESCE(SUM(w.estimated_loss), 0) as loss,
                COALESCE(SUM(w.quantity), 0) as quantity
            FROM Wastage_Record w
            JOIN Product p ON w.product_id = p.product_id
            WHERE w.date_recorded >= ?
            GROUP BY w.product_id, p.product_name
            ORDER BY loss DESC
            LIMIT 10
        ", [$startDate]);

        // Payment method breakdown
        $paymentBreakdown = SalesTransaction::where('status', 'Completed')
            ->where('transaction_date', '>=', $startDate)
            ->select('payment_method', DB::raw('SUM(total_amount) as revenue'))
            ->groupBy('payment_method')
            ->get();

        // Average forecast confidence
        $avgConfidence = DB::table('Forecast_Result')
            ->where('created_at', '>=', now()->subDays(30))
            ->avg('confidence');

        return response()->json([
            'sales_trend' => $salesTrend,
            'wastage_trend' => $wastageTrend,
            'leakage_by_category' => $leakageByCategory,
            'inventory_health' => $inventoryHealth,
            'top_wasted_products' => $topWastedProducts,
            'payment_breakdown' => $paymentBreakdown,
            'forecast_confidence' => $avgConfidence ? round((float) $avgConfidence, 1) : null,
        ]);
    }
}
