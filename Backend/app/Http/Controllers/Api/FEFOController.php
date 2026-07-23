<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FEFOBatch;
use App\Models\StockMovement;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class FEFOController extends Controller
{
    public function batches()
    {
        $batches = FEFOBatch::with('product.category')
            ->orderBy('expiry_date')
            ->get()
            ->map(fn ($b) => [
                'batch_id'      => $b->batch_id,
                'product_id'    => $b->product_id,
                'product_name'  => $b->product?->product_name,
                'sku'           => $b->product?->barcode,
                'category'      => $b->product?->category?->Category_name ?? '',
                'batch_number'  => $b->batch_number,
                'quantity'      => $b->quantity,
                'expiry_date'   => $b->expiry_date,
                'days_left'     => now()->diffInDays(\Carbon\Carbon::parse($b->expiry_date), false),
                'status'        => $b->status,
                'directive_notes' => $b->directive_notes,
            ]);

        return response()->json([
            'batches' => $batches,
            'total_batches' => $batches->count(),
            'critical_count' => $batches->filter(fn ($b) => $b['days_left'] >= 0 && $b['days_left'] <= 7)->count(),
            'expiring_soon_count' => $batches->filter(fn ($b) => $b['days_left'] > 7 && $b['days_left'] <= 30)->count(),
        ]);
    }

    public function show($id)
    {
        $batch = FEFOBatch::with('product.category', 'creator')->findOrFail($id);

        $movements = StockMovement::where('product_id', $batch->product_id)
            ->with('user')
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
            'days_left'     => now()->diffInDays(\Carbon\Carbon::parse($batch->expiry_date), false),
            'status'        => $batch->status,
            'directive_notes' => $batch->directive_notes,
            'created_by'    => $batch->creator?->Full_name ?? 'System',
            'created_at'    => $batch->created_at,
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

        $batch = FEFOBatch::findOrFail($data['batch_id']);

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
            'user_id'     => $userId,
            'action'      => "FEFO {$data['action']}: Batch #{$batch->batch_id} ({$batch->product?->product_name})",
            'entity_type' => 'FEFO_Batch',
            'entity_id'   => $batch->batch_id,
            'old_values'  => null,
            'new_values'  => json_encode(['status' => $batch->status, 'directive_notes' => $batch->directive_notes]),
            'created_at'  => now(),
        ]);

        return response()->json(['message' => 'Directive applied.', 'batch' => [
            'batch_id' => $batch->batch_id,
            'status'   => $batch->status,
        ]]);
    }
}