<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index()
    {
        return response()->json(
            Inventory::with('product')->get()->map(fn ($i) => [
                'id'            => $i->inventory_id,
                'product_id'    => $i->product_id,
                'product_name'  => $i->product?->product_name,
                'sku'           => $i->product?->barcode,
                'current_stock' => $i->current_stock,
                'stock_status'  => $i->stock_status,
                'reorder_level' => $i->product?->reorder_level,
                'last_updated'  => $i->last_updated,
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
