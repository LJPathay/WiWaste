<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Inventory;
use App\Models\FEFOLog;

class AlertController extends Controller
{
    /**
     * Get expiring items alerts.
     * GET /api/alerts/expiring
     */
    public function expiring(Request $request)
    {
        $daysThreshold = $request->input('days', 7);

        // Get FEFO batches expiring within the threshold
        $expiringBatches = FEFOLog::whereRaw('DATEDIFF(expiry_date, NOW()) <= ?', [$daysThreshold])
            ->whereRaw('DATEDIFF(expiry_date, NOW()) >= 0')
            ->with('inventory')
            ->get()
            ->map(function ($batch) {
                $daysToExpiry = now()->diffInDays(\Carbon\Carbon::parse($batch->expiry_date), false);
                return [
                    'batch_id' => $batch->batch_id,
                    'product_id' => $batch->product_id,
                    'product_name' => $batch->inventory->product_name ?? 'Unknown',
                    'quantity' => $batch->quantity,
                    'expiry_date' => $batch->expiry_date,
                    'days_to_expiry' => abs($daysToExpiry),
                    'status' => $daysToExpiry <= 3 ? 'critical' : 'warning',
                ];
            });

        // Get low stock items
        $lowStockItems = Inventory::where('current_stock', '<', 10)
            ->where('current_stock', '>', 0)
            ->get()
            ->map(function ($item) {
                return [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name ?? 'Unknown',
                    'current_stock' => $item->current_stock,
                    'status' => 'low_stock',
                ];
            });

        return response()->json([
            'expiring_batches' => $expiringBatches,
            'low_stock_items' => $lowStockItems,
            'total_alerts' => $expiringBatches->count() + $lowStockItems->count(),
        ]);
    }
}
