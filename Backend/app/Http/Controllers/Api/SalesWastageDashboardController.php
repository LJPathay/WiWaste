<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\WastageRecord;
use App\Models\WastageFlag;
use App\Models\FEFOBatch;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalesWastageDashboardController extends Controller
{
    use ScopesTenant;

    // Overview: Units sold vs Units wasted, wastage rate, top metrics
    public function overview(Request $request)
    {
        $user = $request->user();
        $from = $request->input('from', Carbon::now()->subDays(30)->startOfDay());
        $to = $request->input('to', Carbon::now()->endOfDay());

        $salesQuery = SalesTransaction::with('salesItems')
            ->where('status', 'Completed')
            ->whereBetween('transaction_date', [$from, $to]);
        $salesQuery = $this->scopeForBusinessAndBranch($salesQuery, $request);
        $sales = $salesQuery->get();

        $wastageQuery = WastageRecord::whereBetween('date_recorded', [$from, $to]);
        $wastageQuery = $this->scopeForBusinessAndBranch($wastageQuery, $request);
        $wastage = $wastageQuery->get();

        $unitsSold = $sales->sum(fn ($s) => $s->salesItems->sum('quantity'));
        $unitsWasted = $wastage->sum('quantity');
        $totalUnits = $unitsSold + $unitsWasted;
        $wastageRate = $totalUnits > 0 ? round(($unitsWasted / $totalUnits) * 100, 2) : 0;

        // By category
        $salesByCategory = $sales->flatMap->salesItems
            ->groupBy(fn ($item) => $item->product?->category?->Category_name ?? 'Unknown')
            ->map(fn ($items) => $items->sum('quantity'));

        $wastageByCategory = $wastage
            ->groupBy(fn ($w) => $w->product?->category?->Category_name ?? 'Unknown')
            ->map(fn ($items) => $items->sum('quantity'));

        $categories = array_unique(array_merge($salesByCategory->keys()->toArray(), $wastageByCategory->keys()->toArray()));
        $categoryBreakdown = [];
        foreach ($categories as $cat) {
            $sold = $salesByCategory->get($cat, 0);
            $wasted = $wastageByCategory->get($cat, 0);
            $total = $sold + $wasted;
            $categoryBreakdown[] = [
                'category' => $cat,
                'units_sold' => $sold,
                'units_wasted' => $wasted,
                'wastage_rate' => $total > 0 ? round(($wasted / $total) * 100, 2) : 0,
            ];
        }

        // Top wasted products
        $topWasted = $wastage->groupBy('product_id')
            ->map(fn ($items) => [
                'product_id' => $items->first()->product_id,
                'product_name' => $items->first()->product?->product_name,
                'sku' => $items->first()->product?->barcode,
                'units_wasted' => $items->sum('quantity'),
                'wastage_value' => $items->sum('estimated_loss'),
            ])
            ->sortByDesc('units_wasted')
            ->take(10)
            ->values();

        // Waste by reason
        $wasteByReason = $wastage->groupBy('wastage_type')
            ->map(fn ($items) => $items->sum('quantity'))
            ->toArray();

        // Near expiry count
        $nearExpiry = FEFOBatch::where('business_id', $user?->business_id)
            ->where('branch_id', $user?->branch_id)
            ->where('status', 'active')
            ->where('quantity', '>', 0)
            ->where('expiry_date', '<=', Carbon::now()->addDays(90))
            ->where('expiry_date', '>=', Carbon::now())
            ->count();

        // Slow movers (products with sales but low velocity)
        $productSales = $sales->flatMap->salesItems
            ->groupBy('product_id')
            ->map(fn ($items) => [
                'product_id' => $items->first()->product_id,
                'product_name' => $items->first()->product?->product_name,
                'sku' => $items->first()->product?->barcode,
                'units_sold' => $items->sum('quantity'),
                'stock' => $items->first()->product?->inventory?->current_stock ?? 0,
            ])
            ->sortBy('units_sold')
            ->take(10)
            ->values();

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'summary' => [
                'units_sold' => $unitsSold,
                'units_wasted' => $unitsWasted,
                'total_units' => $totalUnits,
                'wastage_rate_pct' => $wastageRate,
                'near_expiry_batches' => $nearExpiry,
            ],
            'category_breakdown' => $categoryBreakdown,
            'top_wasted_products' => $topWasted,
            'waste_by_reason' => $wasteByReason,
            'slow_movers' => $productSales,
        ]);
    }

    // Daily time series for charts
    public function timeSeries(Request $request)
    {
        $user = $request->user();
        $from = $request->input('from', Carbon::now()->subDays(30)->startOfDay());
        $to = $request->input('to', Carbon::now()->endOfDay());

        $salesQuery = SalesTransaction::with('salesItems')
            ->where('status', 'Completed')
            ->whereBetween('transaction_date', [$from, $to]);
        $salesQuery = $this->scopeForBusinessAndBranch($salesQuery, $request);
        $sales = $salesQuery->get();

        $wastageQuery = WastageRecord::whereBetween('date_recorded', [$from, $to]);
        $wastageQuery = $this->scopeForBusinessAndBranch($wastageQuery, $request);
        $wastage = $wastageQuery->get();

        $salesByDate = $sales->groupBy(fn ($s) => Carbon::parse($s->transaction_date)->format('Y-m-d'))
            ->map(fn ($items) => $items->flatMap->salesItems->sum('quantity'));

        $wastageByDate = $wastage->groupBy(fn ($w) => Carbon::parse($w->date_recorded)->format('Y-m-d'))
            ->map(fn ($items) => $items->sum('quantity'));

        $dates = collect();
        $current = Carbon::parse($from);
        while ($current->lte($to)) {
            $dateKey = $current->format('Y-m-d');
            $dates->push([
                'date' => $dateKey,
                'units_sold' => $salesByDate->get($dateKey, 0),
                'units_wasted' => $wastageByDate->get($dateKey, 0),
            ]);
            $current->addDay();
        }

        return response()->json($dates);
    }

    // CSV Export
    public function exportCsv(Request $request)
    {
        $user = $request->user();
        $from = $request->input('from', Carbon::now()->subDays(30)->startOfDay());
        $to = $request->input('to', Carbon::now()->endOfDay());

        $salesQuery = SalesTransaction::with('salesItems.product.category')
            ->where('status', 'Completed')
            ->whereBetween('transaction_date', [$from, $to]);
        $salesQuery = $this->scopeForBusinessAndBranch($salesQuery, $request);
        $sales = $salesQuery->get();

        $wastageQuery = WastageRecord::with('product.category')
            ->whereBetween('date_recorded', [$from, $to]);
        $wastageQuery = $this->scopeForBusinessAndBranch($wastageQuery, $request);
        $wastage = $wastageQuery->get();

        $headers = [
            'Type', 'Date', 'Product', 'SKU', 'Category', 'Batch', 'Quantity', 'Reason', 'Value'
        ];

        $rows = [];

        foreach ($sales as $sale) {
            foreach ($sale->salesItems as $item) {
                $rows[] = [
                    'Sales',
                    $sale->transaction_date,
                    $item->product?->product_name ?? 'N/A',
                    $item->product?->barcode ?? 'N/A',
                    $item->product?->category?->Category_name ?? 'N/A',
                    $item->batch?->batch_number ?? 'N/A',
                    $item->quantity,
                    'N/A',
                    $item->subtotal,
                ];
            }
        }

        foreach ($wastage as $w) {
            $rows[] = [
                'Wastage',
                $w->date_recorded,
                $w->product?->product_name ?? 'N/A',
                $w->product?->barcode ?? 'N/A',
                $w->product?->category?->Category_name ?? 'N/A',
                $w->batch?->batch_number ?? 'N/A',
                $w->quantity,
                $w->wastage_type,
                $w->estimated_loss,
            ];
        }

        $callback = function() use ($headers, $rows) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        $filename = 'sales_wastage_report_' . Carbon::now()->format('Ymd_His') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // Flag summary for inventory staff
    public function flagSummary(Request $request)
    {
        $user = $request->user();

        $flagsQuery = WastageFlag::where('status', 'pending');
        $flagsQuery = $this->scopeForBusinessAndBranch($flagsQuery, $request);
        $pendingCount = $flagsQuery->count();

        $byReason = WastageFlag::where('status', 'pending')
            ->where('business_id', $user?->business_id)
            ->where('branch_id', $user?->branch_id)
            ->selectRaw('reason, count(*) as count')
            ->groupBy('reason')
            ->pluck('count', 'reason')
            ->toArray();

        return response()->json([
            'pending_count' => $pendingCount,
            'by_reason' => $byReason,
        ]);
    }
}