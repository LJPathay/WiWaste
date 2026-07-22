<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Inventory::with('product.category');

        if ($search = $request->input('search')) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('stock_status', $status);
        }

        $limit = min((int) $request->input('per_page', 200), 1000);
        return response()->json(
            $query->take($limit)->get()->map(fn ($i) => [
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

        $inventory = Inventory::where('product_id', $data['product_id'])->firstOrFail();
        $inventory->current_stock += $data['quantity'];
        $inventory->stock_status   = $this->calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
        $inventory->last_updated   = now();
        $inventory->save();

        StockMovement::create([
            'product_id'    => $data['product_id'],
            'user_id'       => $request->user()?->User_id ?? 1,
            'movement_type' => 'Stock In',
            'quantity'      => $data['quantity'],
            'remarks'       => $data['remarks'] ?? null,
            'movement_date' => now(),
        ]);

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Stock-in: {$data['quantity']} units of {$inventory->product?->product_name}",
            'entity_type'   => 'Inventory',
            'entity_id'     => $inventory->inventory_id,
            'old_values'    => null,
            'new_values'    => json_encode(['current_stock' => $inventory->current_stock]),
            'created_at'    => now(),
        ]);

        return response()->json(['message' => 'Stock added.', 'new_stock' => $inventory->current_stock]);
    }

    public function stockOut(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:Product,product_id',
            'quantity'   => 'required|integer|min:1',
            'remarks'    => 'nullable|string|max:255',
        ]);

        $inventory = Inventory::where('product_id', $data['product_id'])->firstOrFail();

        if ($inventory->current_stock < $data['quantity']) {
            return response()->json(['message' => 'Insufficient stock.'], 422);
        }

        $inventory->current_stock -= $data['quantity'];
        $inventory->stock_status   = $this->calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
        $inventory->last_updated   = now();
        $inventory->save();

        StockMovement::create([
            'product_id'    => $data['product_id'],
            'user_id'       => $request->user()?->User_id ?? 1,
            'movement_type' => 'Stock Out',
            'quantity'      => $data['quantity'],
            'remarks'       => $data['remarks'] ?? null,
            'movement_date' => now(),
        ]);

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Stock-out: {$data['quantity']} units of {$inventory->product?->product_name}",
            'entity_type'   => 'Inventory',
            'entity_id'     => $inventory->inventory_id,
            'old_values'    => null,
            'new_values'    => json_encode(['current_stock' => $inventory->current_stock]),
            'created_at'    => now(),
        ]);

        return response()->json(['message' => 'Stock removed.', 'new_stock' => $inventory->current_stock]);
    }

    private function calcStatus(int $stock, int $reorderLevel): string
    {
        if ($stock <= 0) return 'Low Stock';
        if ($stock <= $reorderLevel) return 'Low Stock';
        if ($stock > $reorderLevel * 5) return 'Overstock';
        return 'Normal';
    }
}
