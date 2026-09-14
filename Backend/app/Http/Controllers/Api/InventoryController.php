<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    protected function scopeForBusinessAndBranch($query, Request $request)
    {
        $user = $request->user();
        if ($user && $user->business_id) {
            $query->where('business_id', $user->business_id);
        }
        if ($user && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        return $query;
    }

    public function index(Request $request)
    {
        $query = Inventory::with('product.category');
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($search = $request->input('search')) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('stock_status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->paginate($perPage)->through(fn ($i) => [
                'id'             => $i->inventory_id,
                'product_id'     => $i->product_id,
                'product_name'   => $i->product?->product_name,
                'sku'            => $i->product?->barcode,
                'category'       => $i->product?->category?->Category_name ?? '',
                'category_id'    => $i->product?->category_id,
                'cost_price'     => (float) ($i->product?->cost_price ?? 0),
                'selling_price'  => (float) ($i->product?->selling_price ?? 0),
                'supplier'       => $i->product?->supplier?->supplier_name ?? '',
                'supplier_id'    => $i->product?->supplier_id,
                'current_stock'  => $i->current_stock,
                'stock_status'   => $i->stock_status,
                'reorder_level'  => $i->product?->reorder_level,
                'expiration_date'=> $i->product?->expiration_date,
                'last_updated'   => $i->last_updated,
                'business_id'    => $i->business_id,
                'branch_id'      => $i->branch_id,
            ])
        );
    }

    public function stockIn(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:Product,product_id',
            'quantity'   => 'required|integer|min:1',
            'remarks'    => 'nullable|string|max:255',
        ]);

        $query = Inventory::where('product_id', $data['product_id']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrFail();

        return DB::transaction(function () use ($data, $request, $inventory) {
            $inventory->current_stock += $data['quantity'];
            $inventory->stock_status   = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
            $inventory->last_updated   = now();
            $inventory->save();

            $user = $request->user();
            StockMovement::create([
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
                'product_id'    => $data['product_id'],
                'user_id'       => $user?->User_id ?? 1,
                'movement_type' => 'Stock In',
                'quantity'      => $data['quantity'],
                'remarks'       => $data['remarks'] ?? null,
                'movement_date' => now(),
            ]);

            AuditLog::create([
                'user_id'       => $user?->User_id ?? 1,
                'action'        => "Stock-in: {$data['quantity']} units of {$inventory->product?->product_name}",
                'entity_type'   => 'Inventory',
                'entity_id'     => $inventory->inventory_id,
                'old_values'    => null,
                'new_values'    => json_encode(['current_stock' => $inventory->current_stock]),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Stock added.', 'new_stock' => $inventory->current_stock]);
        });
    }

    public function stockOut(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:Product,product_id',
            'quantity'   => 'required|integer|min:1',
            'remarks'    => 'nullable|string|max:255',
        ]);

        $query = Inventory::where('product_id', $data['product_id']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrFail();

        if ($inventory->current_stock < $data['quantity']) {
            return response()->json(['message' => 'Insufficient stock.'], 422);
        }

        return DB::transaction(function () use ($data, $request, $inventory) {
            $inventory->current_stock -= $data['quantity'];
            $inventory->stock_status   = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
            $inventory->last_updated   = now();
            $inventory->save();

            $user = $request->user();
            StockMovement::create([
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
                'product_id'    => $data['product_id'],
                'user_id'       => $user?->User_id ?? 1,
                'movement_type' => 'Stock Out',
                'quantity'      => $data['quantity'],
                'remarks'       => $data['remarks'] ?? null,
                'movement_date' => now(),
            ]);

            AuditLog::create([
                'user_id'       => $user?->User_id ?? 1,
                'action'        => "Stock-out: {$data['quantity']} units of {$inventory->product?->product_name}",
                'entity_type'   => 'Inventory',
                'entity_id'     => $inventory->inventory_id,
                'old_values'    => null,
                'new_values'    => json_encode(['current_stock' => $inventory->current_stock]),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Stock removed.', 'new_stock' => $inventory->current_stock]);
        });
    }

    public function movements($id)
    {
        $query = Inventory::with('product');
        $query = $this->scopeForBusinessAndBranch($query, request());
        $inventory = $query->findOrFail($id);

        $query = StockMovement::where('product_id', $inventory->product_id);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $movements = $query->with('user')
            ->orderByDesc('movement_date')
            ->get()
            ->map(fn ($m) => [
                'movement_id' => $m->movement_id,
                'type'        => $m->movement_type,
                'quantity'    => $m->quantity,
                'remarks'     => $m->remarks,
                'recorded_by' => $m->user?->Full_name ?? 'System',
                'date'        => $m->movement_date,
                'business_id' => $m->business_id,
                'branch_id'   => $m->branch_id,
                'batch_id'    => $m->batch_id,
            ]);

        return response()->json([
            'product_id'    => $inventory->product_id,
            'product_name'  => $inventory->product?->product_name,
            'current_stock' => $inventory->current_stock,
            'movements'     => $movements,
        ]);
    }

    public function allMovements(Request $request)
    {
        $query = StockMovement::with(['product.category', 'user']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($search = $request->input('search')) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($type = $request->input('movement_type')) {
            $query->where('movement_type', $type);
        }

        if ($from = $request->input('from_date')) {
            $query->whereDate('movement_date', '>=', $from);
        }

        if ($to = $request->input('to_date')) {
            $query->whereDate('movement_date', '<=', $to);
        }

        if ($productId = $request->input('product_id')) {
            $query->where('product_id', $productId);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('movement_date')->paginate($perPage)->through(fn ($m) => [
                'movement_id'    => $m->movement_id,
                'product_id'     => $m->product_id,
                'product_name'   => $m->product?->product_name,
                'sku'            => $m->product?->barcode,
                'category'       => $m->product?->category?->Category_name ?? '',
                'movement_type'  => $m->movement_type,
                'quantity'       => $m->quantity,
                'remarks'        => $m->remarks,
                'recorded_by'    => $m->user?->Full_name ?? 'System',
                'movement_date'  => $m->movement_date,
                'business_id'    => $m->business_id,
                'branch_id'      => $m->branch_id,
                'batch_id'       => $m->batch_id,
            ])
        );
    }
}