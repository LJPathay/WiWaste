<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recall;
use App\Models\FEFOBatch;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class RecallController extends Controller
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
        $query = Recall::with(['product', 'batch', 'supplier', 'initiator', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($severity = $request->input('severity')) {
            $query->where('severity', $severity);
        }

        if ($productId = $request->input('product_id')) {
            $query->where('product_id', $productId);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('created_at')->paginate($perPage)
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'business_id' => 'sometimes|integer|exists:businesses,id',
            'branch_id'   => 'sometimes|integer|exists:branches,id',
            'product_id'  => 'required|integer|exists:Product,product_id',
            'batch_id'    => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'supplier_id' => 'nullable|integer|exists:Supplier,supplier_id',
            'reason'      => 'required|string|max:1000',
            'severity'    => 'required|in:low,medium,high,critical',
            'affected_batches' => 'required|array|min:1',
            'affected_batches.*.batch_id' => 'required|integer|exists:FEFO_Batch,batch_id',
            'affected_batches.*.quantity' => 'required|integer|min:1',
            'target_resolution_date' => 'nullable|date',
        ]);

        // Auto-assign business_id and branch_id from user if not provided
        if (!isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }
        if (!isset($data['branch_id']) && $user && $user->branch_id) {
            $data['branch_id'] = $user->branch_id;
        }

        $data['recall_number'] = 'REC-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        $data['initiated_by'] = $user?->User_id ?? 1;
        $data['initiated_date'] = now()->toDateString();
        $data['status'] = 'draft';

        // Calculate total quantity affected
        $data['total_quantity_affected'] = collect($data['affected_batches'])->sum('quantity');

        $recall = Recall::create($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Created recall {$data['recall_number']} for product #{$data['product_id']}",
            'entity_type'   => 'Recall',
            'entity_id'     => $recall->recall_id,
            'old_values'    => null,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $recall->load(['product', 'batch', 'supplier', 'initiator', 'approver']);

        return response()->json([
            'message' => 'Recall created.',
            'recall' => $recall,
        ], 201);
    }

    public function show($id)
    {
        $query = Recall::with(['product', 'batch', 'supplier', 'initiator', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $recall = $query->findOrFail($id);

        return response()->json($recall);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();

        $query = Recall::with(['product', 'batch', 'supplier', 'initiator', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $recall = $query->findOrFail($id);

        $data = $request->validate([
            'reason'               => 'sometimes|string|max:1000',
            'severity'             => 'sometimes|in:low,medium,high,critical',
            'target_resolution_date' => 'nullable|date',
            'affected_batches'     => 'sometimes|array|min:1',
            'affected_batches.*.batch_id' => 'required|integer|exists:FEFO_Batch,batch_id',
            'affected_batches.*.quantity' => 'required|integer|min:1',
            'resolution_notes'     => 'nullable|string|max:1000',
        ]);

        if (isset($data['affected_batches'])) {
            $data['total_quantity_affected'] = collect($data['affected_batches'])->sum('quantity');
        }

        $recall->update($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Updated recall #{$recall->recall_number}",
            'entity_type'   => 'Recall',
            'entity_id'     => $recall->recall_id,
            'old_values'    => json_encode($recall->getOriginal()),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $recall->load(['product', 'batch', 'supplier', 'initiator', 'approver']);

        return response()->json([
            'message' => 'Recall updated.',
            'recall' => $recall,
        ]);
    }

    public function activate(Request $request, $id)
    {
        $user = $request->user();

        $query = Recall::with(['product', 'batch', 'supplier', 'initiator', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $recall = $query->findOrFail($id);

        if ($recall->status !== 'draft') {
            return response()->json(['message' => 'Only draft recalls can be activated.'], 422);
        }

        $recall->update(['status' => 'active']);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Activated recall {$recall->recall_number}",
            'entity_type'   => 'Recall',
            'entity_id'     => $recall->recall_id,
            'new_values'    => json_encode(['status' => 'active']),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $recall->load(['product', 'batch', 'supplier', 'initiator', 'approver']);

        return response()->json([
            'message' => 'Recall activated.',
            'recall' => $recall,
        ]);
    }

    public function quarantine(Request $request, $id)
    {
        $user = $request->user();

        $query = Recall::with(['product', 'batch', 'supplier', 'initiator', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $recall = $query->findOrFail($id);

        if ($recall->status === 'quarantined') {
            return response()->json(['message' => 'Recall already quarantined.'], 422);
        }

        $quarantinedCount = $recall->quarantineAffectedInventory();

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Quarantined {$quarantinedCount} batches for recall {$recall->recall_number}",
            'entity_type'   => 'Recall',
            'entity_id'     => $recall->recall_id,
            'new_values'    => json_encode(['status' => 'quarantined', 'quarantined_count' => $quarantinedCount]),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $recall->load(['product', 'batch', 'supplier', 'initiator', 'approver']);

        return response()->json([
            'message' => "Quarantined {$quarantinedCount} affected batches.",
            'recall' => $recall,
        ]);
    }

    public function notify(Request $request, $id)
    {
        $user = $request->user();

        $query = Recall::with(['product', 'batch', 'supplier', 'initiator', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $recall = $query->findOrFail($id);

        $recall->notifyAffectedParties();

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Sent notifications for recall {$recall->recall_number}",
            'entity_type'   => 'Recall',
            'entity_id'     => $recall->recall_id,
            'new_values'    => json_encode(['status' => 'notified']),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $recall->load(['product', 'batch', 'supplier', 'initiator', 'approver']);

        return response()->json([
            'message' => 'Notifications sent for recall.',
            'recall' => $recall,
        ]);
    }

    public function resolve(Request $request, $id)
    {
        $user = $request->user();

        $query = Recall::with(['product', 'batch', 'supplier', 'initiator', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $recall = $query->findOrFail($id);

        $data = $request->validate([
            'resolution_notes' => 'required|string|max:1000',
            'release_quarantine' => 'nullable|boolean',
        ]);

        $recall->resolve($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Resolved recall {$recall->recall_number}",
            'entity_type'   => 'Recall',
            'entity_id'     => $recall->recall_id,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $recall->load(['product', 'batch', 'supplier', 'initiator', 'approver']);

        return response()->json([
            'message' => 'Recall resolved.',
            'recall' => $recall,
        ]);
    }

    public function summary(Request $request)
    {
        $query = Recall::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        $summary = [
            'total' => $query->count(),
            'by_status' => [
                'draft' => (clone $query)->where('status', 'draft')->count(),
                'active' => (clone $query)->where('status', 'active')->count(),
                'quarantined' => (clone $query)->where('status', 'quarantined')->count(),
                'notified' => (clone $query)->where('status', 'notified')->count(),
                'resolved' => (clone $query)->where('status', 'resolved')->count(),
                'closed' => (clone $query)->where('status', 'closed')->count(),
            ],
            'by_severity' => [
                'critical' => (clone $query)->where('severity', 'critical')->count(),
                'high' => (clone $query)->where('severity', 'high')->count(),
                'medium' => (clone $query)->where('severity', 'medium')->count(),
                'low' => (clone $query)->where('severity', 'low')->count(),
            ],
            'total_quantity_affected' => $query->sum('total_quantity_affected'),
        ];

        return response()->json($summary);
    }
}