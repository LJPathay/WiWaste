<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Models\VendorReturn;
use App\Models\VendorReturnItem;
use App\Models\Inventory;
use App\Models\FEFOBatch;
use App\Models\AuditLog;
use App\Http\Requests\Api\StoreVendorReturnRequest;
use App\Http\Requests\Api\UpdateVendorReturnRequest;
use App\Http\Requests\Api\RejectVendorReturnRequest;
use App\Http\Requests\Api\ReceiveVendorReturnRequest;
use App\Http\Resources\VendorReturnResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorReturnController extends Controller
{
    use ScopesTenant;

    public function index(Request $request)
    {
        $query = VendorReturn::with(['supplier', 'creator', 'approver', 'items.product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($supplierId = $request->input('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('created_at')->paginate($perPage)
                ->through(fn ($vr) => (new VendorReturnResource($vr))->toArray($request))
        );
    }

    public function store(StoreVendorReturnRequest $request)
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
        $data['created_by'] = $userId;
        $data['status'] = 'pending_approval';
        $data['return_number'] = 'VR-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
        $data['requested_date'] = now()->toDateString();

        return DB::transaction(function () use ($data, $userId) {
            $vendorReturn = VendorReturn::create($data);

            $totalCredit = 0;
            foreach ($data['items'] as $item) {
                $unitCost = $item['unit_cost'];
                $quantity = $item['quantity'];
                $totalCredit = $unitCost * $quantity;

                VendorReturnItem::create([
                    'vendor_return_id' => $vendorReturn->vendor_return_id,
                    'product_id' => $item['product_id'],
                    'batch_id' => $item['batch_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_cost' => $unitCost,
                    'total_credit' => $totalCredit,
                    'reason' => $item['reason'] ?? null,
                ]);
            }

            $vendorReturn->update(['total_credit_amount' => array_sum(array_column($data['items'], function($i) { return $i['quantity'] * $i['unit_cost']; }))]);

            AuditLog::create([
                'user_id'       => $userId,
                'action'        => "Created vendor return {$vendorReturn->return_number} for supplier #{$data['supplier_id']}",
                'entity_type'   => 'Vendor_Return',
                'entity_id'     => $vendorReturn->vendor_return_id,
                'old_values'    => null,
                'new_values'    => json_encode($data),
                'created_at'    => now(),
                'business_id'   => $data['business_id'] ?? null,
                'branch_id'     => $data['branch_id'] ?? null,
            ]);

            $vendorReturn->load(['supplier', 'creator', 'items.product']);

            return response()->json([
                'message' => 'Vendor return request created.',
                'vendor_return' => (new VendorReturnResource($vendorReturn))->toArray($request),
            ], 201);
        });
    }

    public function show($id)
    {
        $query = VendorReturn::with(['supplier', 'creator', 'approver', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $vendorReturn = $query->findOrFail($id);

        return new VendorReturnResource($vendorReturn);
    }

    public function update(UpdateVendorReturnRequest $request, $id)
    {
        $user = $request->user();

        $query = VendorReturn::with(['items.product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $vendorReturn = $query->findOrFail($id);

        if (!in_array($vendorReturn->status, ['draft', 'pending_approval'])) {
            return response()->json(['message' => 'Cannot modify vendor return in current status.'], 422);
        }

        $data = $request->validated();

        $vendorReturn->update($data);

        if (isset($data['items'])) {
            $vendorReturn->items()->delete();
            $totalCredit = 0;
            foreach ($data['items'] as $item) {
                $totalCredit = $item['quantity'] * $item['unit_cost'];
                VendorReturnItem::create([
                    'vendor_return_id' => $vendorReturn->vendor_return_id,
                    'product_id' => $item['product_id'],
                    'batch_id' => $item['batch_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'total_credit' => $totalCredit,
                    'reason' => $item['reason'] ?? null,
                ]);
            }
            $vendorReturn->update(['total_credit_amount' => array_sum(array_column($data['items'], function($i) { return $i['quantity'] * $i['unit_cost']; }))]);
        }

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Updated vendor return {$vendorReturn->return_number}",
            'entity_type'   => 'Vendor_Return',
            'entity_id'     => $vendorReturn->vendor_return_id,
            'old_values'    => json_encode($vendorReturn->getOriginal()),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $vendorReturn->load(['supplier', 'creator', 'approver', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Vendor return updated.',
            'vendor_return' => (new VendorReturnResource($vendorReturn))->toArray($request),
        ]);
    }

    public function approve(Request $request, $id)
    {
        $user = $request->user();

        $query = VendorReturn::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $vendorReturn = $query->findOrFail($id);

        if ($vendorReturn->status !== 'pending_approval') {
            return response()->json(['message' => 'Only pending returns can be approved.'], 422);
        }

        $vendorReturn->approve($user?->User_id ?? 1);

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Approved vendor return {$vendorReturn->return_number}",
            'entity_type'   => 'Vendor_Return',
            'entity_id'     => $vendorReturn->vendor_return_id,
            'new_values'    => json_encode(['status' => 'approved']),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Vendor return approved.',
            'vendor_return' => (new VendorReturnResource($vendorReturn->fresh()->load(['supplier', 'creator', 'approver', 'items.product'])))->toArray($request),
        ]);
    }

    public function reject(RejectVendorReturnRequest $request, $id)
    {
        $user = $request->user();

        $query = VendorReturn::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $vendorReturn = $query->findOrFail($id);

        if ($vendorReturn->status !== 'pending_approval') {
            return response()->json(['message' => 'Only pending returns can be rejected.'], 422);
        }

        $data = $request->validated();

        $vendorReturn->reject($user?->User_id ?? 1, $data['reason']);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Rejected vendor return {$vendorReturn->return_number}: {$data['reason']}",
            'entity_type'   => 'Vendor_Return',
            'entity_id'     => $vendorReturn->vendor_return_id,
            'new_values'    => json_encode(['status' => 'rejected', 'rejection_reason' => $data['reason']]),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Vendor return rejected.',
            'vendor_return' => (new VendorReturnResource($vendorReturn->fresh()->load(['supplier', 'creator', 'approver', 'items.product'])))->toArray($request),
        ]);
    }

    public function ship(Request $request, $id)
    {
        $user = $request->user();

        $query = VendorReturn::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $vendorReturn = $query->findOrFail($id);

        if ($vendorReturn->status !== 'approved') {
            return response()->json(['message' => 'Only approved returns can be shipped.'], 422);
        }

        $vendorReturn->ship();

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Shipped vendor return {$vendorReturn->return_number}",
            'entity_type'   => 'Vendor_Return',
            'entity_id'     => $vendorReturn->vendor_return_id,
            'new_values'    => json_encode(['status' => 'shipped']),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Vendor return marked as shipped.',
            'vendor_return' => (new VendorReturnResource($vendorReturn->fresh()))->toArray($request),
        ]);
    }

    public function receive(ReceiveVendorReturnRequest $request, $id)
    {
        $user = $request->user();

        $query = VendorReturn::with('items.product', 'items.batch');
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $vendorReturn = $query->findOrFail($id);

        if ($vendorReturn->status !== 'shipped') {
            return response()->json(['message' => 'Only shipped returns can be received.'], 422);
        }

        $data = $request->validated();

        $vendorReturn->receive();

        $totalCredit = 0;
        $receivedItems = [];

        // Process each item - create credit note for received items
        foreach ($vendorReturn->items as $item) {
            $itemData = collect($data['items'] ?? [])->firstWhere('vendor_return_item_id', $item->vendor_return_item_id);
            
            $receivedQty = $itemData['received_quantity'] ?? $item->quantity;
            $rejectedQty = $itemData['rejected_quantity'] ?? 0;
            
            // Create credit note for received items
            if ($receivedQty > 0) {
                $creditAmount = $receivedQty * $item->unit_cost;
                $totalCredit += $creditAmount;
                
                $receivedItems[] = [
                    'vendor_return_item_id' => $item->vendor_return_item_id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->product_name,
                    'batch_id' => $item->batch_id,
                    'received_quantity' => $receivedQty,
                    'rejected_quantity' => $rejectedQty,
                    'unit_cost' => $item->unit_cost,
                    'credit_amount' => $creditAmount,
                    'rejection_reason' => $itemData['rejection_reason'] ?? null,
                ];
            }
        }

        // Update vendor return with credit info
        $vendorReturn->update([
            'total_credit_amount' => $totalCredit,
        ]);

        // Create credit note record (in a real implementation, this would create a credit note document)
        // For now, we log the credit in audit log
        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Received vendor return {$vendorReturn->return_number} with credit ₱{$totalCredit}",
            'entity_type'   => 'Vendor_Return',
            'entity_id'     => $vendorReturn->vendor_return_id,
            'new_values'    => json_encode([
                'status' => 'received',
                'received_items' => $receivedItems,
                'total_credit' => $totalCredit,
            ]),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Vendor return received with credit note.',
            'vendor_return' => (new VendorReturnResource($vendorReturn->fresh()->load('items.product', 'items.batch')))->toArray($request),
            'credit_note' => [
                'total_credit' => $totalCredit,
                'items' => $receivedItems,
            ],
        ], 200);
    }

    public function credit(Request $request, $id)
    {
        $user = $request->user();

        $query = VendorReturn::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $vendorReturn = $query->findOrFail($id);

        if ($vendorReturn->status !== 'received') {
            return response()->json(['message' => 'Only received returns can be credited.'], 422);
        }

        $vendorReturn->credit();

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Credited vendor return {$vendorReturn->return_number}",
            'entity_type'   => 'Vendor_Return',
            'entity_id'     => $vendorReturn->vendor_return_id,
            'new_values'    => json_encode(['status' => 'credited', 'total_credit' => $vendorReturn->total_credit_amount]),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Vendor return credited.',
            'vendor_return' => (new VendorReturnResource($vendorReturn->fresh()))->toArray($request),
        ]);
    }

    public function summary(Request $request)
    {
        $query = VendorReturn::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);

        $summary = [
            'total' => $query->count(),
            'by_status' => [
                'draft' => (clone $query)->where('status', 'draft')->count(),
                'pending_approval' => (clone $query)->where('status', 'pending_approval')->count(),
                'approved' => (clone $query)->where('status', 'approved')->count(),
                'rejected' => (clone $query)->where('status', 'rejected')->count(),
                'shipped' => (clone $query)->where('status', 'shipped')->count(),
                'received' => (clone $query)->where('status', 'received')->count(),
                'credited' => (clone $query)->where('status', 'credited')->count(),
                'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
            ],
            'total_credit_amount' => $query->sum('total_credit_amount'),
            'by_reason' => [
                'overstock' => (clone $query)->where('return_reason_code', 'overstock')->count(),
                'near_expiry' => (clone $query)->where('return_reason_code', 'near_expiry')->count(),
                'damaged' => (clone $query)->where('return_reason_code', 'damaged')->count(),
                'wrong_shipment' => (clone $query)->where('return_reason_code', 'wrong_shipment')->count(),
                'quality_issue' => (clone $query)->where('return_reason_code', 'quality_issue')->count(),
                'recall' => (clone $query)->where('return_reason_code', 'recall')->count(),
                'expired' => (clone $query)->where('return_reason_code', 'expired')->count(),
                'other' => (clone $query)->where('return_reason_code', 'other')->count(),
            ],
        ];

        return response()->json($summary);
    }
}