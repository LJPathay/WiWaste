<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WastageRecord;
use App\Models\StockMovement;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\ReturnTransaction;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function wasteSummary(Request $request)
    {
        $from = $request->input('from', '');
        $to   = $request->input('to', '');
        $cacheKey = "reports.waste_summary.{$from}.{$to}";

        return response()->json(Cache::remember($cacheKey, 900, function () use ($from, $to) {
            $query = DB::table('Wastage_Record AS wr')
                ->join('Product AS p', 'wr.product_id', '=', 'p.product_id')
                ->leftJoin('Category AS c', 'p.category_id', '=', 'c.Category_id');

            if ($from) {
                $query->where('wr.date_recorded', '>=', $from);
            }
            if ($to) {
                $query->where('wr.date_recorded', '<=', $to . ' 23:59:59');
            }

            $records = $query->get([
                'c.Category_name AS category',
                'p.product_name',
                'wr.wastage_type',
                'wr.quantity',
                'wr.estimated_loss',
                'wr.date_recorded',
            ]);

            $grouped = $records->groupBy(fn ($r) => $r->category ?? 'Uncategorized');

            return $grouped->map(fn ($items, $category) => [
                'category'       => $category,
                'total_quantity' => $items->sum('quantity'),
                'total_loss'     => (float) $items->sum('estimated_loss'),
                'count'          => $items->count(),
                'items'          => $items->map(fn ($r) => [
                    'product'  => $r->product_name,
                    'type'     => $r->wastage_type,
                    'quantity' => $r->quantity,
                    'loss'     => (float) $r->estimated_loss,
                    'date'     => $r->date_recorded,
                ])->values(),
            ])->values();
        }));
    }

    public function inventoryMovement(Request $request)
    {
        $from = $request->input('from', '');
        $to   = $request->input('to', '');

        $query = StockMovement::with('product');

        if ($from) {
            $query->where('movement_date', '>=', $from);
        }
        if ($to) {
            $query->where('movement_date', '<=', $to . ' 23:59:59');
        }

        return response()->json(
            $query->orderBy('movement_date', 'desc')->take(200)->get()->map(fn ($m) => [
                'id'       => $m->movement_id,
                'product'  => $m->product?->product_name,
                'type'     => $m->movement_type,
                'quantity' => $m->quantity,
                'remarks'  => $m->remarks,
                'date'     => $m->movement_date,
            ])
        );
    }

    public function supplierPerformance()
    {
        return response()->json(Cache::remember('reports.supplier_performance', 900, function () {
            return DB::table('Supplier AS s')
                ->leftJoin('Product AS p', 's.supplier_id', '=', 'p.supplier_id')
                ->leftJoin('Inventory AS i', 'p.product_id', '=', 'i.product_id')
                ->select(
                    's.supplier_id AS id',
                    's.supplier_name AS name',
                    's.contact_person',
                    's.contact_number',
                    DB::raw('COUNT(DISTINCT p.product_id) AS product_count'),
                    DB::raw('COALESCE(SUM(i.current_stock), 0) AS total_stock')
                )
                ->groupBy('s.supplier_id', 's.supplier_name', 's.contact_person', 's.contact_number')
                ->get();
        }));
    }

    public function expiryAnalysis(Request $request)
    {
        $days = (int) $request->input('days', 30);
        $cacheKey = "reports.expiry_analysis.{$days}";

        return response()->json(Cache::remember($cacheKey, 900, function () use ($days) {
            return DB::table('Product AS p')
                ->leftJoin('Inventory AS i', 'p.product_id', '=', 'i.product_id')
                ->leftJoin('Category AS c', 'p.category_id', '=', 'c.Category_id')
                ->where('p.expiration_date', '>=', now())
                ->where('p.expiration_date', '<=', now()->addDays($days))
                ->orderBy('p.expiration_date')
                ->select(
                    'p.product_id AS id',
                    'p.product_name AS name',
                    'p.barcode AS sku',
                    'c.Category_name AS category',
                    DB::raw('COALESCE(i.current_stock, 0) AS stock'),
                    'p.expiration_date'
                )
                ->get()
                ->map(fn ($p) => [
                    'id'               => $p->id,
                    'name'             => $p->name,
                    'sku'              => $p->sku,
                    'category'         => $p->category,
                    'stock'            => $p->stock,
                    'expiration_date'  => $p->expiration_date,
                    'days_until_expiry' => now()->diffInDays($p->expiration_date, false),
                ]);
        }));
    }

    public function categoryAnalysis()
    {
        return response()->json(Cache::remember('reports.category_analysis', 900, function () {
            return DB::table('Category AS c')
                ->leftJoin('Product AS p', 'c.Category_id', '=', 'p.category_id')
                ->leftJoin('Inventory AS i', 'p.product_id', '=', 'i.product_id')
                ->leftJoin('Wastage_Record AS wr', 'p.product_id', '=', 'wr.product_id')
                ->select(
                    'c.Category_name AS category',
                    DB::raw('COUNT(DISTINCT p.product_id) AS total_products'),
                    DB::raw('COALESCE(SUM(i.current_stock), 0) AS total_stock'),
                    DB::raw('COALESCE(SUM(wr.quantity), 0) AS total_waste'),
                    DB::raw('COALESCE(SUM(wr.estimated_loss), 0) AS total_waste_loss')
                )
                ->groupBy('c.Category_id', 'c.Category_name')
                ->get();
        }));
    }

    public function costImpact()
    {
        return response()->json(Cache::remember('reports.cost_impact', 900, function () {
            $totalWasteLoss  = (float) WastageRecord::sum('estimated_loss');
            $totalSales      = (float) SalesTransaction::where('status', 'Completed')->sum('total_amount');
            $totalReturns    = (float) ReturnTransaction::sum('refund_amount');
            $totalStockValue = (float) DB::table('Product AS p')
                ->join('Inventory AS i', 'p.product_id', '=', 'i.product_id')
                ->sum(DB::raw('i.current_stock * p.cost_price'));

            return [
                'total_waste_loss'    => $totalWasteLoss,
                'total_sales'         => $totalSales,
                'total_returns'       => $totalReturns,
                'total_stock_value'   => $totalStockValue,
                'waste_to_sales_ratio' => $totalSales > 0 ? round($totalWasteLoss / $totalSales * 100, 2) : 0,
            ];
        }));
    }

    public function salesVatSummary(Request $request)
    {
        $from = $request->input('from', '');
        $to   = $request->input('to', '');

        $query = SalesTransaction::where('status', 'Completed');
        if ($from) $query->whereDate('transaction_date', '>=', $from);
        if ($to)   $query->whereDate('transaction_date', '<=', $to);

        $totals = $query->selectRaw('
            SUM(total_amount) as total_sales,
            SUM(vat_amount) as total_vat,
            SUM(vatable_amount) as total_vatable,
            SUM(non_vatable_amount) as total_non_vatable,
            SUM(senior_pwd_discount_amount) as total_senior_pwd_discount,
            SUM(senior_pwd_vat_exempt_amount) as total_senior_pwd_vat_exempt,
            SUM(discount_amount) as total_discount
        ')->first();

        $dailyBreakdown = SalesTransaction::where('status', 'Completed')
            ->when($from, fn ($q) => $q->whereDate('transaction_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('transaction_date', '<=', $to))
            ->selectRaw('
                DATE(transaction_date) as date,
                COUNT(*) as transaction_count,
                SUM(total_amount) as daily_sales,
                SUM(vat_amount) as daily_vat,
                SUM(vatable_amount) as daily_vatable,
                SUM(non_vatable_amount) as daily_non_vatable,
                SUM(senior_pwd_discount_amount) as daily_senior_pwd_discount,
                SUM(discount_amount) as daily_discount
            ')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'summary' => $totals,
            'daily_breakdown' => $dailyBreakdown,
        ]);
    }

    public function discountSummary(Request $request)
    {
        $from = $request->input('from', '');
        $to   = $request->input('to', '');

        $query = SalesTransaction::where('status', 'Completed');
        if ($from) $query->whereDate('transaction_date', '>=', $from);
        if ($to)   $query->whereDate('transaction_date', '<=', $to);

        $totals = $query->selectRaw('
            SUM(discount_amount) as total_discount,
            SUM(senior_pwd_discount_amount) as total_senior_pwd_discount,
            SUM(senior_pwd_vat_exempt_amount) as total_senior_pwd_vat_exempt
        ')->first();

        // Item-level discounts
        $itemDiscounts = DB::table('Sales_Item')
            ->join('Sales_Transaction', 'Sales_Item.transaction_id', '=', 'Sales_Transaction.transaction_id')
            ->where('Sales_Transaction.status', 'Completed')
            ->when($from, fn ($q) => $q->whereDate('Sales_Transaction.transaction_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('Sales_Transaction.transaction_date', '<=', $to))
            ->selectRaw('
                SUM(discount_amount) as total_item_discount,
                SUM(CASE WHEN is_senior_pwd_exempt = 1 THEN discount_amount ELSE 0 END) as senior_pwd_item_discount,
                COUNT(*) as discounted_items_count
            ')
            ->first();

        return response()->json([
            'transaction_level' => $totals,
            'item_level' => $itemDiscounts,
            'combined' => [
                'total_discount' => ($totals->total_discount ?? 0) + ($itemDiscounts->total_item_discount ?? 0),
                'total_senior_pwd_discount' => ($totals->total_senior_pwd_discount ?? 0) + ($itemDiscounts->senior_pwd_item_discount ?? 0),
            ],
        ]);
    }

    public function seniorPwdTransactionLog(Request $request)
    {
        $from = $request->input('from', '');
        $to   = $request->input('to', '');

        $transactions = SalesTransaction::where('status', 'Completed')
            ->where('senior_pwd_type', '!=', 'none')
            ->when($from, fn ($q) => $q->whereDate('transaction_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('transaction_date', '<=', $to))
            ->with(['user', 'salesItems.product'])
            ->orderByDesc('transaction_date')
            ->get()
            ->map(fn ($t) => [
                'transaction_id' => $t->transaction_id,
                'date' => $t->transaction_date,
                'cashier' => $t->user?->Full_name,
                'senior_pwd_type' => $t->senior_pwd_type,
                'senior_pwd_id' => $t->senior_pwd_id,
                'senior_pwd_name' => $t->senior_pwd_name,
                'senior_pwd_discount' => $t->senior_pwd_discount_amount,
                'senior_pwd_vat_exempt' => $t->senior_pwd_vat_exempt_amount,
                'total_amount' => $t->total_amount,
                'items' => $t->salesItems->map(fn ($item) => [
                    'product_name' => $item->product?->product_name,
                    'quantity' => $item->quantity,
                    'is_exempt' => $item->is_senior_pwd_exempt,
                    'discount' => $item->discount_amount,
                ]),
            ]);

        return response()->json($transactions);
    }
}
