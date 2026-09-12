<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Inventory;

class CycleCountController extends Controller
{
    /**
     * Record a cycle count for inventory reconciliation.
     * POST /api/inventory/cycle-count
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:inventory,product_id',
            'counted_quantity' => 'required|integer|min:0',
            'remarks' => 'nullable|string|max:500',
        ]);

        $inventory = Inventory::where('product_id', $validated['product_id'])->firstOrFail();

        $difference = $validated['counted_quantity'] - $inventory->current_stock;

        DB::transaction(function () use ($inventory, $validated, $difference) {
            // Update stock to the counted quantity
            $inventory->update([
                'current_stock' => $validated['counted_quantity'],
                'stock_status' => $this->calcStatus($validated['counted_quantity']),
            ]);

            // Record stock movement if there's a difference
            if ($difference !== 0) {
                \App\Models\StockMovement::create([
                    'product_id' => $inventory->product_id,
                    'movement_type' => $difference > 0 ? 'Stock In' : 'Stock Out',
                    'quantity' => abs($difference),
                    'remarks' => $validated['remarks'] ?? 'Cycle count adjustment',
                    'recorded_by' => $request->user()?->name ?? 'System',
                ]);
            }
        });

        return response()->json([
            'message' => 'Cycle count recorded',
            'product_id' => $validated['product_id'],
            'previous_stock' => $inventory->current_stock,
            'counted_stock' => $validated['counted_quantity'],
            'adjustment' => $difference,
        ]);
    }

    private function calcStatus(int $stock): string
    {
        if ($stock <= 0) return 'Out of Stock';
        if ($stock < 10) return 'Low Stock';
        if ($stock > 300) return 'Overstock';
        return 'Normal';
    }
}
