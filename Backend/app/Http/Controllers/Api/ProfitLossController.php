<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\WastageRecord;
use App\Models\Product;
use App\Models\ReturnTransaction;
use App\Models\SalesItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProfitLossController extends Controller
{
    public function overview()
    {
        return response()->json(Cache::remember('profit_loss.overview', 600, function () {
            $totalSales       = (float) SalesTransaction::where('status', 'Completed')->sum('total_amount');
            $totalWastageLoss = (float) WastageRecord::sum('estimated_loss');
            $totalReturns     = (float) ReturnTransaction::sum('refund_amount');
            $totalCOGS        = (float) DB::table('Sales_Item')
                ->join('Product', 'Sales_Item.product_id', '=', 'Product.product_id')
                ->join('Sales_Transaction', 'Sales_Item.transaction_id', '=', 'Sales_Transaction.transaction_id')
                ->where('Sales_Transaction.status', 'Completed')
                ->sum(DB::raw('Sales_Item.quantity * Product.cost_price'));

            return [
                'total_sales'        => $totalSales,
                'total_cogs'         => $totalCOGS,
                'total_wastage_loss' => $totalWastageLoss,
                'total_returns'      => $totalReturns,
                'net_profit'         => $totalSales - $totalCOGS - $totalWastageLoss - $totalReturns,
                'gross_margin'       => $totalSales > 0
                    ? round(($totalSales - $totalCOGS) / $totalSales * 100, 2)
                    : 0,
            ];
        }));
    }

    public function byCategory()
    {
        return response()->json(Cache::remember('profit_loss.by_category', 600, function () {
            $salesByCategory = DB::table('Category AS c')
                ->leftJoin('Product AS p', 'c.Category_id', '=', 'p.category_id')
                ->leftJoin('Sales_Item AS si', 'p.product_id', '=', 'si.product_id')
                ->leftJoin('Sales_Transaction AS st', function ($join) {
                    $join->on('si.transaction_id', '=', 'st.transaction_id')
                         ->where('st.status', '=', 'Completed');
                })
                ->select(
                    'c.Category_name AS category',
                    DB::raw('COALESCE(SUM(si.subtotal), 0) AS total_sales'),
                    DB::raw('COUNT(DISTINCT p.product_id) AS product_count')
                )
                ->groupBy('c.Category_id', 'c.Category_name')
                ->get();

            $wasteByCategory = DB::table('Wastage_Record AS wr')
                ->join('Product AS p', 'wr.product_id', '=', 'p.product_id')
                ->rightJoin('Category AS c', 'p.category_id', '=', 'c.Category_id')
                ->select('c.Category_name AS category',
                    DB::raw('COALESCE(SUM(wr.estimated_loss), 0) AS total_waste_loss'))
                ->groupBy('c.Category_id', 'c.Category_name')
                ->get()
                ->keyBy('category');

            return $salesByCategory->map(function ($row) use ($wasteByCategory) {
                return [
                    'category'         => $row->category,
                    'total_sales'      => (float) $row->total_sales,
                    'total_waste_loss' => (float) ($wasteByCategory[$row->category]->total_waste_loss ?? 0),
                    'product_count'    => $row->product_count,
                ];
            })->values();
        }));
    }

    public function trends(Request $request)
    {
        $period     = $request->input('period', 'monthly');
        $cacheKey   = "profit_loss.trends.{$period}";

        return response()->json(Cache::remember($cacheKey, 600, function () use ($period) {
            $dateFormat = $period === 'yearly' ? '%Y' : '%Y-%m';

            $salesTrends = DB::table('Sales_Transaction')
                ->where('status', 'Completed')
                ->select(DB::raw("DATE_FORMAT(transaction_date, '{$dateFormat}') AS period"),
                    DB::raw('SUM(total_amount) AS total'))
                ->groupBy('period')
                ->orderBy('period')
                ->get()
                ->keyBy('period');

            $wastageTrends = DB::table('Wastage_Record')
                ->select(DB::raw("DATE_FORMAT(date_recorded, '{$dateFormat}') AS period"),
                    DB::raw('SUM(estimated_loss) AS total'))
                ->groupBy('period')
                ->orderBy('period')
                ->get()
                ->keyBy('period');

            $allPeriods = collect(array_merge(
                $salesTrends->keys()->toArray(),
                $wastageTrends->keys()->toArray()
            ))->unique()->sort()->values();

            return $allPeriods->map(fn ($p) => [
                'period'       => $p,
                'sales'        => (float) ($salesTrends[$p]->total ?? 0),
                'wastage_loss' => (float) ($wastageTrends[$p]->total ?? 0),
            ]);
        }));
    }
}
