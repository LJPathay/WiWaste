<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorReturnController extends Controller
{
    /**
     * Mark a vendor return as received.
     * POST /api/vendor-returns/{id}/receive
     */
    public function receive(Request $request, int $id)
    {
        $validated = $request->validate([
            'quantity_received' => 'required|integer|min:1',
            'condition' => 'nullable|string|in:good,damaged,expired',
            'remarks' => 'nullable|string|max:500',
        ]);

        // Record stock-in for received goods
        \App\Models\Inventory::where('product_id', $id)
            ->increment('current_stock', $validated['quantity_received']);

        \App\Models\StockMovement::create([
            'product_id' => $id,
            'movement_type' => 'Stock In',
            'quantity' => $validated['quantity_received'],
            'remarks' => 'Vendor return received' . ($validated['remarks'] ? ": {$validated['remarks']}" : ''),
            'recorded_by' => $request->user()?->name ?? 'System',
        ]);

        return response()->json([
            'message' => 'Vendor return received successfully',
            'product_id' => $id,
            'quantity_received' => $validated['quantity_received'],
        ]);
    }

    /**
     * Issue credit for a vendor return.
     * POST /api/vendor-returns/{id}/credit
     */
    public function credit(Request $request, int $id)
    {
        $validated = $request->validate([
            'credit_amount' => 'required|numeric|min:0',
            'reference_number' => 'nullable|string|max:100',
            'remarks' => 'nullable|string|max:500',
        ]);

        // In a real system, this would create a credit note record
        // For now, return success with the credit details
        return response()->json([
            'message' => 'Vendor credit issued',
            'product_id' => $id,
            'credit_amount' => $validated['credit_amount'],
            'reference_number' => $validated['reference_number'] ?? null,
        ]);
    }
}
