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

class InventoryAnalyticsController extends Controller
{
    public function turnover()
    {
        $products = Product::with('inventory', 'salesItems.salesTransaction')->get();

        $data = $products->map(function ($p) {
            $totalSold = $p->salesItems
                ->filter(fn ($si) => $si->salesTransaction?->status === 'Completed')
                ->sum('quantity');
            $avgStock = $p->inventory?->current_stock ?? 1;
            $turnover = $avgStock > 0 ? round($totalSold / $avgStock, 2) : 0;
            $daysOnShelf = $turnover > 0 ? round(365 / $turnover) : 365;

            return [
                'product_id' => $p->product_id,
                'product_name' => $p->product_name,
                'category' => $p->category?->Category_name,
                'total_sold' => $totalSold,
                'avg_stock' => $avgStock,
                'turnover_rate' => $turnover,
                'days_on_shelf' => $daysOnShelf,
                'status' => $turnover >= 4 ? 'Excellent' : ($turnover >= 2 ? 'Normal' : 'Slow'),
            ];
        });

        return response()->json([
            'products' => $data->sortByDesc('turnover_rate')->values(),
            'avg_turnover' => round($data->avg('turnover_rate'), 2),
            'total_dead_stock' => $data->filter(fn ($p) => $p['turnover_rate'] < 1)->count(),
        ]);
    }

    public function overstock()
    {
        $products = Product::with('inventory', 'category')->get();

        $overstockItems = $products->filter(function ($p) {
            $stock = $p->inventory?->current_stock ?? 0;
            $reorder = $p->reorder_level;
            return $reorder > 0 && $stock > $reorder * 2;
        })->map(function ($p) {
            $stock = $p->inventory->current_stock;
            $reorder = $p->reorder_level;
            $excess = $stock - $reorder;
            $exposure = $excess * $p->cost_price;

            return [
                'id' => $p->product_id,
                'name' => $p->product_name,
                'category' => $p->category?->Category_name,
                'qty_on_hand' => $stock,
                'reorder_point' => $reorder,
                'excess_qty' => $excess,
                'unit_cost' => (float) $p->cost_price,
                'exposure' => round($exposure, 2),
                'recommended_action' => $excess > $reorder * 3 ? 'Return to Supplier' : 'Markdown & Sell',
            ];
        })->values();

        return response()->json([
            'items' => $overstockItems,
            'total_exposure' => round($overstockItems->sum('exposure'), 2),
            'total_items' => $overstockItems->count(),
        ]);
    }

    public function dashboardSummary()
    {
        $lowStockCount = Inventory::where('stock_status', 'Low Stock')->count();

        $expiringSoonCount = Product::whereNotNull('expiration_date')
            ->where('expiration_date', '>=', now())
            ->where('expiration_date', '<=', now()->addDays(30))
            ->count();

        $todayMovements = StockMovement::whereDate('movement_date', today())->count();

        $pendingWastageCount = WastageRecord::whereDate('date_recorded', today())->count();

        $criticalFefoCount = FEFOBatch::where('status', 'active')
            ->where('expiry_date', '>=', now())
            ->where('expiry_date', '<=', now()->addDays(7))
            ->count();

        return response()->json([
            'low_stock_count'       => $lowStockCount,
            'expiring_soon_count'   => $expiringSoonCount,
            'today_movements'       => $todayMovements,
            'pending_wastage_count' => $pendingWastageCount,
            'critical_fefo_count'   => $criticalFefoCount,
        ]);
    }

    public function deadStock()
    {
        $products = Product::with('inventory', 'salesItems.salesTransaction')->get();

        $deadStock = $products->filter(function ($p) {
            $totalSold = $p->salesItems
                ->filter(fn ($si) => $si->salesTransaction?->status === 'Completed')
                ->sum('quantity');
            return $totalSold === 0 && ($p->inventory?->current_stock ?? 0) > 0;
        })->map(function ($p) {
            $stock = $p->inventory->current_stock;
            return [
                'id' => $p->product_id,
                'name' => $p->product_name,
                'category' => $p->category?->Category_name,
                'stock' => $stock,
                'cost_price' => (float) $p->cost_price,
                'locked_capital' => round($stock * $p->cost_price, 2),
                'days_on_shelf' => 90,
            ];
        })->values();

        return response()->json([
            'items' => $deadStock,
            'total_locked_capital' => round($deadStock->sum('locked_capital'), 2),
            'total_items' => $deadStock->count(),
        ]);
    }
}
