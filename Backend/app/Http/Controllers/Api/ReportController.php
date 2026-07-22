<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WastageRecord;
use App\Models\StockMovement;
use App\Models\SalesTransaction;
use App\Models\ReturnTransaction;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\Supplier;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function wasteSummary(Request $request)
    {
        $query = WastageRecord::with('product.category');

        if ($from = $request->input('from')) {
            $query->where('date_recorded', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $query->where('date_recorded', '<=', $to . ' 23:59:59');
        }

        $records = $query->get();

        $grouped = $records->groupBy(fn ($r) => $r->product?->category?->Category_name ?? 'Uncategorized');

        return response()->json($grouped->map(fn ($items, $category) => [
            'category' => $category,
            'total_quantity' => $items->sum('quantity'),
            'total_loss' => (float) $items->sum('estimated_loss'),
            'count' => $items->count(),
            'items' => $items->map(fn ($r) => [
                'product' => $r->product?->product_name,
                'type' => $r->wastage_type,
                'quantity' => $r->quantity,
                'loss' => (float) $r->estimated_loss,
                'date' => $r->date_recorded,
            ])->values(),
        ])->values());
    }

    public function inventoryMovement(Request $request)
    {
        $query = StockMovement::with('product');

        if ($from = $request->input('from')) {
            $query->where('movement_date', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $query->where('movement_date', '<=', $to . ' 23:59:59');
        }

        return response()->json(
            $query->orderBy('movement_date', 'desc')->take(200)->get()->map(fn ($m) => [
                'id' => $m->movement_id,
                'product' => $m->product?->product_name,
                'type' => $m->movement_type,
                'quantity' => $m->quantity,
                'remarks' => $m->remarks,
                'date' => $m->movement_date,
            ])
        );
    }

    public function supplierPerformance()
    {
        $suppliers = Supplier::withCount('products')->with('products.inventory')->get();

        return response()->json($suppliers->map(fn ($s) => [
            'id' => $s->supplier_id,
            'name' => $s->supplier_name,
            'contact_person' => $s->contact_person,
            'contact_number' => $s->contact_number,
            'product_count' => $s->products_count,
            'total_stock' => $s->products->sum(fn ($p) => $p->inventory?->current_stock ?? 0),
        ]));
    }

    public function expiryAnalysis(Request $request)
    {
        $days = (int) $request->input('days', 30);

        $products = Product::with('inventory', 'category')
            ->where('expiration_date', '>=', now())
            ->where('expiration_date', '<=', now()->addDays($days))
            ->orderBy('expiration_date')
            ->get();

        return response()->json($products->map(fn ($p) => [
            'id' => $p->product_id,
            'name' => $p->product_name,
            'sku' => $p->barcode,
            'category' => $p->category?->Category_name,
            'stock' => $p->inventory?->current_stock ?? 0,
            'expiration_date' => $p->expiration_date,
            'days_until_expiry' => now()->diffInDays($p->expiration_date, false),
        ]));
    }

    public function categoryAnalysis()
    {
        $products = Product::with('category', 'inventory', 'wastageRecords')->get();
        $grouped = $products->groupBy(fn ($p) => $p->category?->Category_name ?? 'Uncategorized');

        return response()->json($grouped->map(fn ($items, $category) => [
            'category' => $category,
            'total_products' => $items->count(),
            'total_stock' => $items->sum(fn ($p) => $p->inventory?->current_stock ?? 0),
            'total_waste' => $items->sum(fn ($p) => $p->wastageRecords->sum('quantity')),
            'total_waste_loss' => (float) $items->sum(fn ($p) => $p->wastageRecords->sum('estimated_loss')),
        ])->values());
    }

    public function costImpact()
    {
        $totalWasteLoss = (float) WastageRecord::sum('estimated_loss');
        $totalSales = (float) SalesTransaction::where('status', 'Completed')->sum('total_amount');
        $totalReturns = (float) ReturnTransaction::sum('refund_amount');
        $totalStockValue = (float) Product::with('inventory')->get()->sum(
            fn ($p) => ($p->inventory?->current_stock ?? 0) * $p->cost_price
        );

        return response()->json([
            'total_waste_loss' => $totalWasteLoss,
            'total_sales' => $totalSales,
            'total_returns' => $totalReturns,
            'total_stock_value' => $totalStockValue,
            'waste_to_sales_ratio' => $totalSales > 0 ? round($totalWasteLoss / $totalSales * 100, 2) : 0,
        ]);
    }
}
