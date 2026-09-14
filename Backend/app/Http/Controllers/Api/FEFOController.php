<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FEFOBatch;
use App\Models\StockMovement;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Carbon\Carbon;

class FEFOController extends Controller
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

    public function batches(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 20), 100);

        $query = FEFOBatch::with('product.category');
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $batches = $query->orderBy('expiry_date')
            ->paginate($perPage)
            ->through(fn ($b) => [
                'batch_id'      => $b->batch_id,
                'product_id'    => $b->product_id,
                'product_name'  => $b->product?->product_name,
                'sku'           => $b->product?->barcode,
                'category'      => $b->product?->category?->Category_name ?? '',
                'batch_number'  => $b->batch_number,
                'quantity'      => $b->quantity,
                'expiry_date'   => $b->expiry_date,
                'days_left'     => now()->diffInDays(Carbon::parse($b->expiry_date), false),
                'status'        => $b->status,
                'directive_notes' => $b->directive_notes,
                'business_id'   => $b->business_id,
                'branch_id'     => $b->branch_id,
                'received_date' => $b->received_date,
                'received_temperature' => $b->received_temperature,
                'supplier_batch_number' => $b->supplier_batch_number,
            ]);

        $queryTotal = FEFOBatch::query();
        $queryTotal = $this->scopeForBusinessAndBranch($queryTotal, $request);
        $totalBatches = $queryTotal->count();

        $queryCritical = FEFOBatch::where('status', 'active');
        $queryCritical = $this->scopeForBusinessAndBranch($queryCritical, $request);
        $criticalCount = $queryCritical
            ->where('expiry_date', '>=', now())
            ->where('expiry_date', '<=', now()->addDays(7))
            ->count();

        $queryExpiring = FEFOBatch::where('status', 'active');
        $queryExpiring = $this->scopeForBusinessAndBranch($queryExpiring, $request);
        $expiringSoonCount = $queryExpiring
            ->where('expiry_date', '>', now()->addDays(7))
            ->where('expiry_date', '<=', now()->addDays(30))
            ->count();

        return response()->json([
            'batches'             => $batches,
            'total_batches'       => $totalBatches,
            'critical_count'      => $criticalCount,
            'expiring_soon_count' => $expiringSoonCount,
        ]);
    }

    public function show($id)
    {
        $query = FEFOBatch::with('product.category', 'creator');
        $query = $this->scopeForBusinessAndBranch($query, request());
        $batch = $query->findOrFail($id);

        $query = StockMovement::where('product_id', $batch->product_id);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $movements = $query->with('user')
            ->orderByDesc('movement_date')
            ->take(50)
            ->get()
            ->map(fn ($m) => [
                'movement_id' => $m->movement_id,
                'type'        => $m->movement_type,
                'quantity'    => $m->quantity,
                'remarks'     => $m->remarks,
                'recorded_by' => $m->user?->Full_name ?? 'System',
                'date'        => $m->movement_date,
                'business_id' => $m->business_id,
                'branch_id'   => $m->branch_id,
                'batch_id'    => $m->batch_id,
            ]);

        return response()->json([
            'batch_id'      => $batch->batch_id,
            'product_id'    => $batch->product_id,
            'product_name'  => $batch->product?->product_name,
            'sku'           => $batch->product?->barcode,
            'category'      => $batch->product?->category?->Category_name ?? '',
            'batch_number'  => $batch->batch_number,
            'quantity'      => $batch->quantity,
            'expiry_date'   => $batch->expiry_date,
            'days_left'     => now()->diffInDays(Carbon::parse($batch->expiry_date), false),
            'status'        => $batch->status,
            'directive_notes' => $batch->directive_notes,
            'created_by'    => $batch->creator?->Full_name ?? 'System',
            'created_at'    => $batch->created_at,
            'business_id'   => $batch->business_id,
            'branch_id'     => $batch->branch_id,
            'received_date' => $batch->received_date,
            'received_temperature' => $batch->received_temperature,
            'supplier_batch_number' => $batch->supplier_batch_number,
            'movements'     => $movements,
        ]);
    }

    public function apply(Request $request)
    {
        $data = $request->validate([
            'batch_id'       => 'required|integer|exists:FEFO_Batch,batch_id',
            'action'         => 'required|in:flag,clear,notify',
            'directive_notes'=> 'nullable|string|max:500',
        ]);

        $query = FEFOBatch::query();
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $batch = $query->findOrFail($data['batch_id']);

        $statusMap = [
            'flag'   => 'flagged',
            'clear'  => 'cleared',
            'notify' => 'active',
        ];

        $batch->status = $statusMap[$data['action']];
        if ($data['directive_notes'] ?? null) {
            $batch->directive_notes = $data['directive_notes'];
        }
        $batch->save();

        $userId = $request->user()?->User_id ?? 1;

        AuditLog::create([
            'user_id'       => $userId,
            'action'        => "FEFO {$data['action']}: Batch #{$batch->batch_id} ({$batch->product?->product_name})",
            'entity_type'   => 'FEFO_Batch',
            'entity_id'     => $batch->batch_id,
            'old_values'    => null,
            'new_values'    => json_encode(['status' => $batch->status, 'directive_notes' => $batch->directive_notes]),
            'created_at'    => now(),
            'business_id'   => $request->user()?->business_id,
            'branch_id'     => $request->user()?->branch_id,
        ]);

        return response()->json(['message' => 'Directive applied.', 'batch' => [
            'batch_id' => $batch->batch_id,
            'status'   => $batch->status,
        ]]);
    }
}