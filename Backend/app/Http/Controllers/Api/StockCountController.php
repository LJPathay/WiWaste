<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Models\StockCount;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use App\Http\Requests\Api\StoreStockCountRequest;
use App\Http\Requests\Api\RejectStockCountRequest;
use App\Http\Resources\StockCountResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockCountController extends Controller
{
    use ScopesTenant;

    public function index(Request $request)
    {
        $query = StockCount::with(['product', 'batch', 'counter', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($productId = $request->input('product_id')) {
            $query->where('product_id', $productId);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('created_at')->paginate($perPage)->through(fn ($c) => (new StockCountResource($c))->resolve($request))
        );
    }

    // Record a stock count (Inventory Staff / Owner)
    public function store(StoreStockCountRequest $request)
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

        // Get system quantity
        $query = Inventory::with('product')->where('product_id', $data['product_id']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrFail();

        $data['counted_by'] = $userId;
        $data['system_qty'] = $inventory->current_stock;
        $data['variance']   = $data['counted_qty'] - $inventory->current_stock;
        $data['status']     = 'pending';

        $count = StockCount::create($data);

        AuditLog::create([
            'user_id'       => $userId,
            'action'        => "Recorded stock count for {$inventory->product?->product_name}: system {$data['system_qty']}, counted {$data['counted_qty']}, variance {$data['variance']}",
            'entity_type'   => 'Stock_Count',
            'entity_id'     => $count->count_id,
            'old_values'    => null,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json(['message' => 'Stock count recorded for review.', 'count_id' => $count->count_id], 201);
    }

    // Owner / Inventory: Approve count (creates adjustment movement)
    public function approve(Request $request, $id)
    {
        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        $query = StockCount::with(['product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $count = $query->findOrFail($id);

        if ($count->status !== 'pending') {
            return response()->json(['message' => 'Count already processed.'], 422);
        }

        return DB::transaction(function () use ($count, $userId, $user, $request) {
            // Create adjustment stock movement
            StockMovement::create([
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
                'product_id'    => $count->product_id,
                'batch_id'      => $count->batch_id,
                'user_id'       => $userId,
                'movement_type' => $count->variance >= 0 ? 'Adjustment In' : 'Adjustment Out',
                'quantity'      => abs($count->variance),
                'remarks'       => 'Stock count adjustment: ' . ($count->notes ?? 'Cycle count'),
                'movement_date' => now(),
            ]);

            // Update inventory
            $inventory = Inventory::where('product_id', $count->product_id);
            $inventory = $this->scopeForBusinessAndBranch($inventory, $request);
            $inventory = $inventory->first();

            if ($inventory) {
                $inventory->current_stock = $count->counted_qty;
                $inventory->stock_status = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                $inventory->last_updated = now();
                $inventory->save();
            }

            $count->update([
                'status'       => 'approved',
                'approved_by'  => $userId,
                'approved_at'  => now(),
            ]);

            AuditLog::create([
                'user_id'       => $userId,
                'action'        => "Approved stock count #{$count->count_id}: variance {$count->variance}",
                'entity_type'   => 'Stock_Count',
                'entity_id'     => $count->count_id,
                'old_values'    => json_encode(['status' => 'pending']),
                'new_values'    => json_encode(['status' => 'approved']),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Stock count approved and inventory adjusted.']);
        });
    }

    // Owner / Inventory: Reject count
    public function reject(RejectStockCountRequest $request, $id)
    {
        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        $query = StockCount::with(['product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $count = $query->findOrFail($id);

        if ($count->status !== 'pending') {
            return response()->json(['message' => 'Count already processed.'], 422);
        }

        $data = $request->validated();

        $count->update([
            'status'            => 'rejected',
            'approved_by'       => $userId,
            'approved_at'       => now(),
            'rejection_reason'  => $data['rejection_reason'],
        ]);

        AuditLog::create([
            'user_id'       => $userId,
            'action'        => "Rejected stock count #{$count->count_id}: {$data['rejection_reason']}",
            'entity_type'   => 'Stock_Count',
            'entity_id'     => $count->count_id,
            'old_values'    => json_encode(['status' => 'pending']),
            'new_values'    => json_encode(['status' => 'rejected', 'rejection_reason' => $data['rejection_reason']]),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json(['message' => 'Stock count rejected.']);
    }
}
