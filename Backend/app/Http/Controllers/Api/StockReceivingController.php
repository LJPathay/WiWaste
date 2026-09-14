<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\StockReceiving;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockReceivingController extends Controller
{
    protected function scopeForBusinessAndBranch($query, Request $request)
    {
        $user = $request->user();
        if ($user && $user->business_id) {
            $query->where('business_id', $user->business_id);
        }
        if ($user && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        return $query;
    }

    public function index(Request $request)
    {
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('received_at')->paginate($perPage)
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'business_id'       => 'sometimes|integer|exists:businesses,id',
            'branch_id'         => 'sometimes|integer|exists:branches,id',
            'supplier_id'       => 'required|integer|exists:Supplier,supplier_id',
            'received_by'       => 'sometimes|integer|exists:User,User_id',
            'received_at'       => 'nullable|date',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes'             => 'nullable|string|max:500',
            'status'            => 'nullable|in:pending,received,verified,rejected,partial',
        ]);

        // Auto-assign business_id and branch_id from user if not provided
        if (!isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }
        if (!isset($data['branch_id']) && $user && $user->branch_id) {
            $data['branch_id'] = $user->branch_id;
        }
        if (!isset($data['received_by']) && $user && $user->User_id) {
            $data['received_by'] = $user->User_id;
        }
        if (!isset($data['received_at'])) {
            $data['received_at'] = now();
        }
        if (!isset($data['status'])) {
            $data['status'] = 'received';
        }

        $receiving = StockReceiving::create($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Created stock receiving record for supplier #{$receiving->supplier_id}",
            'entity_type'   => 'Stock_Receiving',
            'entity_id'     => $receiving->receiving_id,
            'old_values'    => null,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $receiving->load(['supplier', 'receiver', 'verifier']);

        return response()->json([
            'message' => 'Stock receiving record created.',
            'receiving' => $receiving,
        ], 201);
    }

    public function show($id)
    {
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $receiving = $query->findOrFail($id);

        return response()->json($receiving);
    }

    public function update(Request $request, $id)
    {
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validate([
            'supplier_id'       => 'sometimes|integer|exists:Supplier,supplier_id',
            'received_by'       => 'sometimes|integer|exists:User,User_id',
            'verified_by'       => 'nullable|integer|exists:User,User_id',
            'received_at'       => 'sometimes|date',
            'verified_at'       => 'nullable|date',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes'             => 'nullable|string|max:500',
            'status'            => 'sometimes|in:pending,received,verified,rejected,partial',
        ]);

        $receiving->update($data);

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Updated stock receiving record #{$receiving->receiving_id}",
            'entity_type'   => 'Stock_Receiving',
            'entity_id'     => $receiving->receiving_id,
            'old_values'    => json_encode($receiving->getOriginal()),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $request->user()?->business_id,
            'branch_id'     => $request->user()?->branch_id,
        ]);

        $receiving->load(['supplier', 'receiver', 'verifier']);

        return response()->json([
            'message' => 'Stock receiving record updated.',
            'receiving' => $receiving,
        ]);
    }

    public function verify(Request $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validate([
            'verified_by' => 'sometimes|integer|exists:User,User_id',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        if (!isset($data['verified_by']) && $user && $user->User_id) {
            $data['verified_by'] = $user->User_id;
        }
        $data['verified_at'] = now();
        $data['status'] = 'verified';

        $receiving->update($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Verified stock receiving record #{$receiving->receiving_id}",
            'entity_type'   => 'Stock_Receiving',
            'entity_id'     => $receiving->receiving_id,
            'old_values'    => json_encode($receiving->getOriginal()),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $receiving->load(['supplier', 'receiver', 'verifier']);

        return response()->json([
            'message' => 'Stock receiving record verified.',
            'receiving' => $receiving,
        ]);
    }

    public function reject(Request $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $receiving->update([
            'status' => 'rejected',
            'notes' => ($receiving->notes ? $receiving->notes . "\n" : '') . "Rejected: {$data['reason']}",
        ]);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Rejected stock receiving record #{$receiving->receiving_id}: {$data['reason']}",
            'entity_type'   => 'Stock_Receiving',
            'entity_id'     => $receiving->receiving_id,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json(['message' => 'Order rejected.']);
    }

    public function discard(Request $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $receiving->update([
            'status' => 'rejected',
            'notes' => ($receiving->notes ? $receiving->notes . "\n" : '') . "Discarded: {$data['reason']}",
        ]);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Discarded stock receiving record #{$receiving->receiving_id}: {$data['reason']}",
            'entity_type'   => 'Stock_Receiving',
            'entity_id'     => $receiving->receiving_id,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json(['message' => 'Order discarded.']);
    }
}