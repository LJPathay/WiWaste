<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Models\WastageFlag;
use App\Models\WastageRecord;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use App\Http\Requests\Api\StoreWastageFlagRequest;
use App\Http\Requests\Api\RejectWastageFlagRequest;
use App\Http\Resources\WastageFlagResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WastageFlagController extends Controller
{
    use ScopesTenant;

    public function index(Request $request)
    {
        $query = WastageFlag::with(['product', 'batch', 'flaggedBy']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('created_at')->paginate($perPage)->through(fn ($f) => (new WastageFlagResource($f))->resolve($request))
        );
    }

    // Cashier: Flag an item for wastage
    public function store(StoreWastageFlagRequest $request)
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
        $data['flagged_by'] = $userId;
        $data['status'] = 'pending';

        $flag = WastageFlag::create($data);

        AuditLog::create([
            'user_id'       => $userId,
            'action'        => "Flagged {$data['reason']} wastage: {$data['quantity']} units of {$flag->product?->product_name}",
            'entity_type'   => 'Wastage_Flag',
            'entity_id'     => $flag->flag_id,
            'old_values'    => null,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json(['message' => 'Wastage flagged for review.', 'flag_id' => $flag->flag_id], 201);
    }

    // Inventory Staff / Owner: Confirm a flagged wastage
    public function confirm(Request $request, $id)
    {
        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        $query = WastageFlag::with(['product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $flag = $query->findOrFail($id);

        if ($flag->status !== 'pending') {
            return response()->json(['message' => 'Flag already processed.'], 422);
        }

        return DB::transaction(function () use ($flag, $userId, $user, $request) {
            // Deduct from inventory
            $query = Inventory::with('product')->where('product_id', $flag->product_id);
            $query = $this->scopeForBusinessAndBranch($query, $request);
            $inventory = $query->first();

            if ($inventory && $inventory->current_stock < $flag->quantity) {
                $productName = $inventory->product?->product_name ?? "Product #{$flag->product_id}";
                return response()->json([
                    'message' => "Insufficient stock for {$productName}. Available: {$inventory->current_stock}, requested: {$flag->quantity}.",
                ], 422);
            }

            // Create wastage record
            $wastage = WastageRecord::create([
                'business_id'     => $flag->business_id,
                'branch_id'       => $flag->branch_id,
                'product_id'      => $flag->product_id,
                'batch_id'        => $flag->batch_id,
                'user_id'         => $userId,
                'wastage_type'    => ucfirst($flag->reason),
                'quantity'        => $flag->quantity,
                'estimated_loss'  => ($inventory?->product?->cost_price ?? 0) * $flag->quantity,
                'date_recorded'   => now()->toDateString(),
            ]);

            if ($inventory) {
                $inventory->current_stock -= $flag->quantity;
                $inventory->stock_status = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                $inventory->last_updated = now();
                $inventory->save();
            }

            // Log movement
            StockMovement::create([
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
                'product_id'    => $flag->product_id,
                'batch_id'      => $flag->batch_id,
                'user_id'       => $userId,
                'movement_type' => 'Wastage',
                'quantity'      => $flag->quantity,
                'remarks'       => 'Wastage confirmed: ' . $flag->reason . ' (Flag #' . $flag->flag_id . ')',
                'movement_date' => now(),
                'wastage_id'    => $wastage->wastage_id,
            ]);

            // Update flag
            $flag->update([
                'status'        => 'confirmed',
                'reviewed_by'   => $userId,
                'reviewed_at'   => now(),
            ]);

            AuditLog::create([
                'user_id'       => $userId,
                'action'        => "Confirmed wastage flag #{$flag->flag_id}: {$flag->quantity} units of {$flag->product?->product_name}",
                'entity_type'   => 'Wastage_Flag',
                'entity_id'     => $flag->flag_id,
                'old_values'    => json_encode(['status' => 'pending']),
                'new_values'    => json_encode(['status' => 'confirmed']),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Wastage confirmed and recorded.']);
        });
    }

    // Inventory Staff / Owner: Reject a flagged wastage
    public function reject(RejectWastageFlagRequest $request, $id)
    {
        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        $query = WastageFlag::with(['product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $flag = $query->findOrFail($id);

        if ($flag->status !== 'pending') {
            return response()->json(['message' => 'Flag already processed.'], 422);
        }

        $data = $request->validated();

        $flag->update([
            'status'            => 'rejected',
            'reviewed_by'       => $userId,
            'reviewed_at'       => now(),
            'rejection_reason'  => $data['rejection_reason'],
        ]);

        AuditLog::create([
            'user_id'       => $userId,
            'action'        => "Rejected wastage flag #{$flag->flag_id}: {$data['rejection_reason']}",
            'entity_type'   => 'Wastage_Flag',
            'entity_id'     => $flag->flag_id,
            'old_values'    => json_encode(['status' => 'pending']),
            'new_values'    => json_encode(['status' => 'rejected', 'rejection_reason' => $data['rejection_reason']]),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json(['message' => 'Wastage flag rejected.']);
    }
}
