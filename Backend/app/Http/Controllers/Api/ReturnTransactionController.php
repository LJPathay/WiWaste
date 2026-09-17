<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReturnTransaction;
use App\Models\SalesItem;
use App\Models\SalesTransaction;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReturnTransactionController extends Controller
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
        $query = ReturnTransaction::with(['salesItem.product', 'user', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($status = $request->input('approval_status')) {
            $query->where('approval_status', $status);
        }

        if ($reasonCode = $request->input('return_reason_code')) {
            $query->where('return_reason_code', $reasonCode);
        }

        if ($from = $request->input('from_date')) {
            $query->whereDate('return_date', '>=', $from);
        }

        if ($to = $request->input('to_date')) {
            $query->whereDate('return_date', '<=', $to);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('return_date')->paginate($perPage)->through(fn ($r) => [
                'id'                => $r->return_id,
                'product_name'      => $r->salesItem?->product?->product_name,
                'sku'               => $r->salesItem?->product?->barcode,
                'returned_by'       => $r->user?->Full_name ?? 'System',
                'quantity_returned' => $r->quantity_returned,
                'reason'            => $r->reason,
                'return_reason_code'=> $r->return_reason_code,
                'refund_amount'     => $r->refund_amount,
                'return_date'       => $r->return_date,
                'approval_status'   => $r->approval_status,
                'approved_by'       => $r->approver?->Full_name,
                'approved_at'       => $r->approved_at,
                'is_within_7_days'  => $r->is_within_7_days,
                'business_id'       => $r->business_id,
                'branch_id'         => $r->branch_id,
            ])
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        $data = $request->validate([
            'sale_item_id'       => 'required|integer|exists:Sales_Item,sales_item_id',
            'quantity_returned'  => 'required|integer|min:1',
            'reason'             => 'nullable|string|max:255',
            'return_reason_code' => 'required|in:defective,wrong_item,change_mind,damaged,expired,missing_parts,not_as_described,other',
            'evidence_notes'     => 'nullable|string|max:1000',
            'evidence_photos'    => 'nullable|array',
            'refund_amount'      => 'required|numeric|min:0',
            'return_date'        => 'required|date',
        ]);

        $saleItem = SalesItem::with(['transaction', 'product'])->findOrFail($data['sale_item_id']);

        // Check if sale item belongs to user's business/branch
        $query = SalesTransaction::where('transaction_id', $saleItem->transaction_id);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $originalSale = $query->first();

        if (!$originalSale) {
            return response()->json(['message' => 'Original sale not found in your scope.'], 404);
        }

        // Check 7-day cooling off period (RA 7394)
        $saleDate = Carbon::parse($originalSale->transaction_date);
        $returnDate = Carbon::parse($data['return_date']);
        $daysSinceSale = $saleDate->diffInDays($returnDate, false);
        $isWithin7Days = $daysSinceSale <= 7;

        if (!$isWithin7Days && !in_array($data['return_reason_code'], ['defective', 'damaged', 'expired'])) {
            return response()->json([
                'message' => 'Returns beyond 7 days are only allowed for defective, damaged, or expired items (RA 7394).',
                'days_since_sale' => $daysSinceSale,
                'is_within_7_days' => false,
            ], 422);
        }

        // Check available quantity (not already returned)
        $alreadyReturned = ReturnTransaction::where('sale_item_id', $saleItem->sales_item_id)
            ->where('approval_status', '!=', 'rejected')
            ->sum('quantity_returned');

        $maxReturnable = $saleItem->quantity - $alreadyReturned;
        if ($data['quantity_returned'] > $maxReturnable) {
            return response()->json([
                'message' => "Cannot return more than purchased. Max returnable: {$maxReturnable}",
                'max_returnable' => $maxReturnable,
            ], 422);
        }

        // Calculate refund amount (proportional to original price paid)
        $originalSubtotal = $saleItem->subtotal;
        $unitRefund = $data['quantity_returned'] > 0 
            ? round(($originalSubtotal / $saleItem->quantity), 2)
            : 0;
        $refundAmount = round($unitRefund * $data['quantity_returned'], 2);

        $data['user_id'] = $userId;
        $data['business_id'] = $user?->business_id;
        $data['branch_id'] = $user?->branch_id;
        $data['refund_amount'] = $refundAmount;
        $data['is_within_7_days'] = $isWithin7Days;
        $data['approval_status'] = $isWithin7Days ? 'approved' : 'pending'; // Auto-approve within 7 days for standard reasons

        $return = ReturnTransaction::create($data);

        // Add stock back
        $inventory = Inventory::where('product_id', $saleItem->product_id);
        $inventory = $this->scopeForBusinessAndBranch($inventory, $request);
        $inventory = $inventory->first();

        if ($inventory) {
            $inventory->current_stock += $data['quantity_returned'];
            $inventory->stock_status = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
            $inventory->last_updated = now();
            $inventory->save();
        }

        StockMovement::create([
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
            'product_id'    => $saleItem->product_id,
            'batch_id'      => $saleItem->batch_id ?? null,
            'user_id'       => $userId,
            'movement_type' => 'Return',
            'quantity'      => $data['quantity_returned'],
            'remarks'       => 'Return: ' . ($data['return_reason_code'] ?? $data['reason'] ?? ''),
            'movement_date' => now(),
            'sale_item_id'  => $data['sale_item_id'],
        ]);

        AuditLog::create([
            'user_id'       => $userId,
            'action'        => "Return: {$data['quantity_returned']} units of {$saleItem->product?->product_name}, refund {$refundAmount}, reason: {$data['return_reason_code']}",
            'entity_type'   => 'Return',
            'entity_id'     => $return->return_id,
            'old_values'    => null,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Return recorded.',
            'id' => $return->return_id,
            'approval_status' => $return->approval_status,
            'refund_amount' => $refundAmount,
            'is_within_7_days' => $isWithin7Days,
        ], 201);
    }

    public function approve(Request $request, $id)
    {
        $user = $request->user();

        $query = ReturnTransaction::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $return = $query->findOrFail($id);

        if ($return->approval_status === 'approved') {
            return response()->json(['message' => 'Return already approved.'], 422);
        }

        $return->update([
            'approval_status' => 'approved',
            'approved_by' => $user?->User_id,
            'approved_at' => now(),
        ]);

        AuditLog::create([
            'user_id'     => $user?->User_id ?? 1,
            'action'      => "Return #{$id} approved",
            'entity_type' => 'Return',
            'entity_id'   => $id,
            'new_values'  => json_encode(['status' => 'approved']),
            'created_at'  => now(),
            'business_id' => $user?->business_id,
            'branch_id'   => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Return approved successfully',
            'return_id' => $id,
            'status' => 'approved',
        ]);
    }

    public function reject(Request $request, $id)
    {
        $user = $request->user();

        $query = ReturnTransaction::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $return = $query->findOrFail($id);

        if ($return->approval_status === 'rejected') {
            return response()->json(['message' => 'Return already rejected.'], 422);
        }

        $data = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $return->update([
            'approval_status' => 'rejected',
            'approved_by' => $user?->User_id,
            'approved_at' => now(),
            'rejection_reason' => $data['rejection_reason'],
        ]);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Return #{$id} rejected: {$data['rejection_reason']}",
            'entity_type'   => 'Return',
            'entity_id'     => $id,
            'new_values'    => json_encode(['status' => 'rejected', 'reason' => $data['rejection_reason']]),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        return response()->json([
            'message' => 'Return rejected',
            'return_id' => $id,
            'status' => 'rejected',
        ]);
    }

    public function show($id)
    {
        $query = ReturnTransaction::with(['salesItem.product', 'user', 'approver']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $return = $query->findOrFail($id);

        return response()->json([
            'id'                => $return->return_id,
            'product_name'      => $return->salesItem?->product?->product_name,
            'sku'               => $return->salesItem?->product?->barcode,
            'returned_by'       => $return->user?->Full_name ?? 'System',
            'quantity_returned' => $return->quantity_returned,
            'reason'            => $return->reason,
            'return_reason_code'=> $return->return_reason_code,
            'evidence_notes'    => $return->evidence_notes,
            'evidence_photos'   => $return->evidence_photos,
            'refund_amount'     => $return->refund_amount,
            'return_date'       => $return->return_date,
            'approval_status'   => $return->approval_status,
            'approved_by'       => $return->approver?->Full_name,
            'approved_at'       => $return->approved_at,
            'rejection_reason'  => $return->rejection_reason,
            'is_within_7_days'  => $return->is_within_7_days,
            'business_id'       => $return->business_id,
            'branch_id'         => $return->branch_id,
        ]);
    }
}