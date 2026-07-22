<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\WastageRecord;
use App\Models\Product;
use App\Models\ReturnTransaction;
use App\Models\SalesItem;
use Illuminate\Http\Request;

class ProfitLossController extends Controller
{
    public function overview()
    {
        $totalSales = (float) SalesTransaction::where('status', 'Completed')->sum('total_amount');
        $totalWastageLoss = (float) WastageRecord::sum('estimated_loss');
        $totalReturns = (float) ReturnTransaction::sum('refund_amount');
        $totalCOGS = (float) SalesItem::join('Product', 'Sales_Item.product_id', '=', 'Product.product_id')
            ->whereHas('salesTransaction', fn ($q) => $q->where('status', 'Completed'))
            ->sum(\DB::raw('Sales_Item.quantity * Product.cost_price'));

        $netProfit = $totalSales - $totalCOGS - $totalWastageLoss - $totalReturns;

        return response()->json([
            'total_sales' => $totalSales,
            'total_cogs' => $totalCOGS,
            'total_wastage_loss' => $totalWastageLoss,
            'total_returns' => $totalReturns,
            'net_profit' => $netProfit,
            'gross_margin' => $totalSales > 0 ? round(($totalSales - $totalCOGS) / $totalSales * 100, 2) : 0,
        ]);
    }

    public function byCategory()
    {
        $products = Product::with('category', 'salesItems.salesTransaction', 'wastageRecords')->get();
        $grouped = $products->groupBy(fn ($p) => $p->category?->Category_name ?? 'Uncategorized');

        return response()->json($grouped->map(fn ($items, $category) => [
            'category' => $category,
            'total_sales' => (float) $items->sum(fn ($p) => $p->salesItems
                ->filter(fn ($si) => $si->salesTransaction?->status === 'Completed')
                ->sum(fn ($si) => $si->subtotal)),
            'total_waste_loss' => (float) $items->sum(fn ($p) => $p->wastageRecords->sum('estimated_loss')),
            'product_count' => $items->count(),
        ])->values());
    }

    public function trends(Request $request)
    {
        $period = $request->input('period', 'monthly');

        $salesQuery = SalesTransaction::where('status', 'Completed')
            ->selectRaw("strftime('%Y-%m', transaction_date) as period")
            ->selectRaw('SUM(total_amount) as total')
            ->groupBy('period')
            ->orderBy('period');

        $wastageQuery = WastageRecord::selectRaw("strftime('%Y-%m', date_recorded) as period")
            ->selectRaw('SUM(estimated_loss) as total')
            ->groupBy('period')
            ->orderBy('period');

        $salesTrends = $salesQuery->get()->keyBy('period');
        $wastageTrends = $wastageQuery->get()->keyBy('period');

        $allPeriods = collect(array_merge(
            $salesTrends->keys()->toArray(),
            $wastageTrends->keys()->toArray()
        ))->unique()->sort()->values();

        return response()->json($allPeriods->map(fn ($p) => [
            'period' => $p,
            'sales' => (float) ($salesTrends[$p]->total ?? 0),
            'wastage_loss' => (float) ($wastageTrends[$p]->total ?? 0),
        ]));
    }
}
