<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCycleCountRequest;
use App\Models\FEFOBatch;
use App\Models\Inventory;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class CycleCountController extends Controller
{
    use ScopesTenant;

    /**
     * Record a cycle count for inventory reconciliation.
     * POST /api/inventory/cycle-count
     */
    public function store(StoreCycleCountRequest $request)
    {
        $validated = $request->validated();

        $query = Inventory::where('product_id', $validated['product_id']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrFail();

        $difference = $validated['counted_quantity'] - $inventory->current_stock;

        DB::transaction(function () use ($inventory, $validated, $difference, $request) {
            // Update stock to the counted quantity
            $inventory->update([
                'current_stock' => $validated['counted_quantity'],
                'stock_status' => $this->calcStatus($validated['counted_quantity']),
            ]);

            // Record stock movement if there's a difference
            if ($difference !== 0) {
                $batchId = $validated['batch_id'] ?? null;

                // If no batch specified but difference exists, try to find active FEFO batch
                if (! $batchId && $difference !== 0) {
                    $batch = FEFOBatch::where('product_id', $inventory->product_id)
                        ->where('business_id', $inventory->business_id)
                        ->where('branch_id', $inventory->branch_id)
                        ->where('status', 'active')
                        ->where('quantity', '>', 0)
                        ->orderBy('expiry_date')
                        ->first();
                    if ($batch) {
                        $batchId = $batch->batch_id;
                    }
                }

                StockMovement::create([
                    'product_id' => $inventory->product_id,
                    'batch_id' => $batchId,
                    'movement_type' => $difference > 0 ? 'Stock In' : 'Stock Out',
                    'quantity' => abs($difference),
                    'remarks' => $validated['remarks'] ?? 'Cycle count adjustment',
                    'user_id' => $request->user()?->User_id ?? 1,
                    'business_id' => $inventory->business_id,
                    'branch_id' => $inventory->branch_id,
                    'movement_date' => now(),
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
        if ($stock <= 0) {
            return 'Out of Stock';
        }
        if ($stock < 10) {
            return 'Low Stock';
        }
        if ($stock > 300) {
            return 'Overstock';
        }

        return 'Normal';
    }
}
