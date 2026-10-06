<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Models\WastageRecord;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use App\Http\Requests\Api\StoreWastageRecordRequest;
use App\Http\Resources\WastageRecordResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WastageRecordController extends Controller
{
    use ScopesTenant;

    public function index(Request $request)
    {
        $query = WastageRecord::with(['product', 'user']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('date_recorded')->paginate($perPage)->through(fn ($w) => (new WastageRecordResource($w))->resolve($request))
        );
    }

    public function store(StoreWastageRecordRequest $request)
    {
        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        $data = $request->validated();

        // Auto-assign business_id and branch_id from user if not provided
        if (!isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }
        if (!isset($data['branch_id']) && $user && $user->branch_id) {
            $data['branch_id'] = $user->branch_id;
        }
        $data['user_id'] = $userId;

        return DB::transaction(function () use ($data, $userId, $user, $request) {
            // Deduct from inventory â€” refuse to go below zero
            $query = Inventory::with('product')->where('product_id', $data['product_id']);
            $query = $this->scopeForBusinessAndBranch($query, $request);
            $inventory = $query->first();

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
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
                'product_id'    => $data['product_id'],
                'batch_id'      => $data['batch_id'] ?? null,
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
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Wastage recorded.'], 201);
        });
    }
}
