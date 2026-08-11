<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WastageRecord;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WastageRecordController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            WastageRecord::with(['product', 'user'])->orderByDesc('date_recorded')->paginate($perPage)->through(fn ($w) => [
                'id'             => $w->wastage_id,
                'product_id'     => $w->product_id,
                'product_name'   => $w->product?->product_name,
                'sku'            => $w->product?->barcode,
                'recorded_by'    => $w->user?->Full_name ?? 'System',
                'wastage_type'   => $w->wastage_type,
                'quantity'       => $w->quantity,
                'estimated_loss' => $w->estimated_loss,
                'date_recorded'  => $w->date_recorded,
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id'     => 'required|integer|exists:Product,product_id',
            'wastage_type'   => 'required|in:Expired,Damaged,Spoiled,Lost',
            'quantity'       => 'required|integer|min:1',
            'estimated_loss' => 'required|numeric|min:0',
            'date_recorded'  => 'required|date',
        ]);

        $userId = $request->user()?->User_id ?? 1;
        $data['user_id'] = $userId;

        return DB::transaction(function () use ($data, $userId) {
            // Deduct from inventory — refuse to go below zero
            $inventory = Inventory::where('product_id', $data['product_id'])->first();
            if ($inventory && $inventory->current_stock < $data['quantity']) {
                $productName = $inventory->product?->product_name ?? "Product #{$data['product_id']}";
                return response()->json([
                    'message' => "Insufficient stock for {$productName}. Available: {$inventory->current_stock}, requested: {$data['quantity']}.",
                ], 422);
            }

            $wastage = WastageRecord::create($data);

            if ($inventory) {
                $inventory->current_stock -= $data['quantity'];
                $inventory->stock_status  = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                $inventory->last_updated  = now();
                $inventory->save();
            }

            // Log movement
            StockMovement::create([
                'product_id'    => $data['product_id'],
                'user_id'       => $userId,
                'movement_type' => 'Stock Out',
                'quantity'      => $data['quantity'],
                'remarks'       => 'Wastage: ' . $data['wastage_type'],
                'movement_date' => now(),
                'wastage_id'    => $wastage->wastage_id,
            ]);

            AuditLog::create([
                'user_id'       => $userId,
                'action'        => "Recorded {$data['wastage_type']} wastage: {$data['quantity']} units of {$wastage->product?->product_name}",
                'entity_type'   => 'Wastage',
                'entity_id'     => $wastage->wastage_id,
                'old_values'    => null,
                'new_values'    => json_encode($data),
                'created_at'    => now(),
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Wastage recorded.'], 201);
        });
    }
}
