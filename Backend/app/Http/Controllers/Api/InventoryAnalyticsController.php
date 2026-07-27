<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\SalesItem;
use App\Models\StockMovement;
use App\Models\WastageRecord;
use App\Models\FEFOBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class InventoryAnalyticsController extends Controller
{
    public function turnover()
    {
        return Cache::remember('analytics.turnover', 600, function () {
            $rows = DB::select("
                SELECT
                    p.product_id,
                    p.product_name,
                    p.cost_price,
                    c.Category_name AS category,
                    COALESCE(i.current_stock, 0) AS current_stock,
                    COALESCE(s.total_sold, 0) AS total_sold
                FROM Product p
                LEFT JOIN Category c ON p.category_id = c.Category_id
                LEFT JOIN Inventory i ON p.product_id = i.product_id
                LEFT JOIN (
                    SELECT si.product_id, SUM(si.quantity) AS total_sold
                    FROM Sales_Item si
                    JOIN Sales_Transaction st ON si.transaction_id = st.transaction_id
                    WHERE st.status = 'Completed'
                    GROUP BY si.product_id
                ) s ON p.product_id = s.product_id
                WHERE p.status = 'Active'
            ");

            $data = collect($rows)->map(function ($r) {
                $avgStock = max((int) $r->current_stock, 1);
                $turnover = round($r->total_sold / $avgStock, 2);
                $daysOnShelf = $turnover > 0 ? round(365 / $turnover) : 365;

                return [
                    'product_id'    => $r->product_id,
                    'product_name'  => $r->product_name,
                    'category'      => $r->category,
                    'total_sold'    => (int) $r->total_sold,
                    'avg_stock'     => $avgStock,
                    'turnover_rate' => $turnover,
                    'days_on_shelf' => $daysOnShelf,
                    'status'        => $turnover >= 4 ? 'Excellent' : ($turnover >= 2 ? 'Normal' : 'Slow'),
                ];
            });

            return [
                'products'         => $data->sortByDesc('turnover_rate')->values(),
                'avg_turnover'     => round($data->avg('turnover_rate'), 2),
                'total_dead_stock' => $data->filter(fn ($p) => $p['turnover_rate'] < 1)->count(),
            ];
        });
    }

    public function overstock()
    {
        return Cache::remember('analytics.overstock', 600, function () {
            $rows = DB::select("
                SELECT
                    p.product_id,
                    p.product_name,
                    p.cost_price,
                    p.reorder_level,
                    c.Category_name AS category,
                    i.current_stock
                FROM Product p
                JOIN Inventory i ON p.product_id = i.product_id
                LEFT JOIN Category c ON p.category_id = c.Category_id
                WHERE p.status = 'Active'
                  AND p.reorder_level > 0
                  AND i.current_stock > p.reorder_level * 2
            ");

            $items = collect($rows)->map(function ($r) {
                $excess = $r->current_stock - $r->reorder_level;
                $exposure = $excess * $r->cost_price;

                return [
                    'id'                 => $r->product_id,
                    'name'               => $r->product_name,
                    'category'           => $r->category,
                    'qty_on_hand'        => $r->current_stock,
                    'reorder_point'      => $r->reorder_level,
                    'excess_qty'         => $excess,
                    'unit_cost'          => (float) $r->cost_price,
                    'exposure'           => round($exposure, 2),
                    'recommended_action' => $excess > $r->reorder_level * 3 ? 'Return to Supplier' : 'Markdown & Sell',
                ];
            })->values();

            return [
                'items'           => $items,
                'total_exposure'  => round($items->sum('exposure'), 2),
                'total_items'     => $items->count(),
            ];
        });
    }

    public function dashboardSummary()
    {
        return Cache::remember('analytics.dashboard_summary', 300, function () {
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

    public function deadStock()
    {
        return Cache::remember('analytics.dead_stock', 600, function () {
            $rows = DB::select("
                SELECT
                    p.product_id,
                    p.product_name,
                    p.cost_price,
                    c.Category_name AS category,
                    i.current_stock
                FROM Product p
                JOIN Inventory i ON p.product_id = i.product_id
                LEFT JOIN Category c ON p.category_id = c.Category_id
                LEFT JOIN Sales_Item si ON p.product_id = si.product_id
                LEFT JOIN Sales_Transaction st ON si.transaction_id = st.transaction_id AND st.status = 'Completed'
                WHERE p.status = 'Active'
                  AND i.current_stock > 0
                GROUP BY p.product_id
                HAVING COALESCE(SUM(si.quantity), 0) = 0
            ");

            $items = collect($rows)->map(function ($r) {
                return [
                    'id'              => $r->product_id,
                    'name'            => $r->product_name,
                    'category'        => $r->category,
                    'stock'           => $r->current_stock,
                    'cost_price'      => (float) $r->cost_price,
                    'locked_capital'  => round($r->current_stock * $r->cost_price, 2),
                    'days_on_shelf'   => 90,
                ];
            })->values();

            return [
                'items'                => $items,
                'total_locked_capital' => round($items->sum('locked_capital'), 2),
                'total_items'          => $items->count(),
            ];
        });
    }
}
