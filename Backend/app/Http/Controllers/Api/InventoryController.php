<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\FEFOBatch;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    use ScopesTenant;

    public function index(Request $request)
    {
        $query = Inventory::with('product.category', 'product.supplier');
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($search = $request->input('search')) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('stock_status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->paginate($perPage)->through(fn ($i) => [
                'id'             => $i->inventory_id,
                'product_id'     => $i->product_id,
                'product_name'   => $i->product?->product_name,
                'sku'            => $i->product?->barcode,
                'category'       => $i->product?->category?->Category_name ?? '',
                'category_id'    => $i->product?->category_id,
                'cost_price'     => (float) ($i->product?->cost_price ?? 0),
                'selling_price'  => (float) ($i->product?->selling_price ?? 0),
                'supplier'       => $i->product?->supplier?->supplier_name ?? '',
                'supplier_id'    => $i->product?->supplier_id,
                'current_stock'  => $i->current_stock,
                'stock_status'   => $i->stock_status,
                'reorder_level'  => $i->product?->reorder_level,
                'expiration_date'=> $i->product?->expiration_date,
                'last_updated'   => $i->last_updated,
                'business_id'    => $i->business_id,
                'branch_id'      => $i->branch_id,
            ])
        );
    }

    public function stockIn(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:Product,product_id',
            'quantity'   => 'required|integer|min:1',
            'remarks'    => 'nullable|string|max:255',
        ]);

        $query = Inventory::with('product')->where('product_id', $data['product_id']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrFail();

        return DB::transaction(function () use ($data, $request, $inventory) {
            $inventory->current_stock += $data['quantity'];
            $inventory->stock_status   = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
            $inventory->last_updated   = now();
            $inventory->save();

            $user = $request->user();
            StockMovement::create([
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
                'product_id'    => $data['product_id'],
                'user_id'       => $user?->User_id ?? 1,
                'movement_type' => 'Stock In',
                'quantity'      => $data['quantity'],
                'remarks'       => $data['remarks'] ?? null,
                'movement_date' => now(),
            ]);

            AuditLog::create([
                'user_id'       => $user?->User_id ?? 1,
                'action'        => "Stock-in: {$data['quantity']} units of {$inventory->product?->product_name}",
                'entity_type'   => 'Inventory',
                'entity_id'     => $inventory->inventory_id,
                'old_values'    => null,
                'new_values'    => json_encode(['current_stock' => $inventory->current_stock]),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Stock added.', 'new_stock' => $inventory->current_stock]);
        });
    }

    public function receive(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:Product,product_id',
            'quantity'   => 'required|integer|min:1',
            'batch_number' => 'required|string|max:50',
            'expiry_date' => 'required|date|after_or_equal:today',
            'remarks'    => 'nullable|string|max:255',
        ]);

        $query = Inventory::with('product')->where('product_id', $data['product_id']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrFail();

        return DB::transaction(function () use ($data, $request, $inventory) {
            $user = $request->user();

            // Create or find batch
            $batch = FEFOBatch::where('product_id', $data['product_id'])
                ->where('batch_number', $data['batch_number'])
                ->where('business_id', $user?->business_id)
                ->where('branch_id', $user?->branch_id)
                ->first();

            if (!$batch) {
                $batch = FEFOBatch::create([
                    'business_id' => $user?->business_id,
                    'branch_id' => $user?->branch_id,
                    'product_id' => $data['product_id'],
                    'batch_number' => $data['batch_number'],
                    'quantity' => 0,
                    'expiry_date' => $data['expiry_date'],
                    'status' => 'active',
                    'received_date' => now()->toDateString(),
                    'created_by' => $user?->User_id ?? 1,
                    // FEFOBatch has $timestamps = false, so this NOT NULL
                    // column has to be supplied explicitly or the insert fails.
                    'created_at' => now(),
                ]);
            } else {
                $batch->expiry_date = $data['expiry_date'];
                $batch->status = 'active';
                $batch->save();
            }

            $batch->quantity += $data['quantity'];
            $batch->save();

            $inventory->current_stock += $data['quantity'];
            $inventory->stock_status = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
            $inventory->last_updated = now();
            $inventory->save();

            StockMovement::create([
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
                'product_id'    => $data['product_id'],
                'batch_id'      => $batch->batch_id,
                'user_id'       => $user?->User_id ?? 1,
                'movement_type' => 'Stock In',
                'quantity'      => $data['quantity'],
                'remarks'       => $data['remarks'] ?? 'Received: Batch ' . $data['batch_number'],
                'movement_date' => now(),
            ]);

            AuditLog::create([
                'user_id'       => $user?->User_id ?? 1,
                'action'        => "Received {$data['quantity']} units of {$inventory->product?->product_name} (Batch: {$data['batch_number']}, Expiry: {$data['expiry_date']})",
                'entity_type'   => 'Inventory',
                'entity_id'     => $inventory->inventory_id,
                'old_values'    => null,
                'new_values'    => json_encode(['current_stock' => $inventory->current_stock, 'batch_number' => $data['batch_number'], 'expiry_date' => $data['expiry_date']]),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json([
                'message' => 'Stock received with batch tracking.',
                'new_stock' => $inventory->current_stock,
                'batch_id' => $batch->batch_id,
            ]);
        });
    }

    public function nearExpiry(Request $request)
    {
        $days = $request->input('days', 90);

        $batches = FEFOBatch::where('business_id', $request->user()?->business_id)
            ->where('branch_id', $request->user()?->branch_id)
            ->where('status', 'active')
            ->where('quantity', '>', 0)
            ->where('expiry_date', '<=', now()->addDays($days))
            ->where('expiry_date', '>=', now())
            ->with(['product.category', 'product.supplier'])
            ->orderBy('expiry_date')
            ->get()
            ->map(fn ($b) => [
                'batch_id' => $b->batch_id,
                'product_id' => $b->product_id,
                'product_name' => $b->product?->product_name,
                'sku' => $b->product?->barcode,
                'category' => $b->product?->category?->Category_name,
                'batch_number' => $b->batch_number,
                'quantity' => $b->quantity,
                'expiry_date' => $b->expiry_date,
                'days_until_expiry' => now()->diffInDays($b->expiry_date, false),
                'supplier' => $b->product?->supplier?->supplier_name,
            ]);

        return response()->json($batches);
    }

    public function stockOut(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:Product,product_id',
            'quantity'   => 'required|integer|min:1',
            'remarks'    => 'nullable|string|max:255',
            'override_reason' => 'nullable|string|max:255',
            'batch_id' => 'nullable|integer|exists:FEFO_Batch,batch_id',
        ]);

        $query = Inventory::with('product')->where('product_id', $data['product_id']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrFail();

        if ($inventory->current_stock < $data['quantity']) {
            return response()->json(['message' => 'Insufficient stock.'], 422);
        }

        return DB::transaction(function () use ($data, $request, $inventory) {
            $remainingQty = $data['quantity'];
            $movements = [];

            // If specific batch_id provided, use that batch
            if (isset($data['batch_id']) && $data['batch_id']) {
                $batch = \App\Models\FEFOBatch::where('batch_id', $data['batch_id'])
                    ->where('product_id', $data['product_id'])
                    ->firstOrFail();
                
                if ($batch->quantity < $remainingQty) {
                    return response()->json(['message' => 'Insufficient quantity in specified batch.'], 422);
                }

                $batch->quantity -= $remainingQty;
                if ($batch->quantity <= 0) {
                    // `FEFO_Batch.status` is an ENUM(active, flagged, cleared).
                    // A fully consumed batch is cleared, not "depleted".
                    $batch->status = 'cleared';
                }
                $batch->save();

                $movements[] = [
                    'batch_id' => $batch->batch_id,
                    'quantity' => $remainingQty,
                ];

                $remainingQty = 0;
            } else {
                // FEFO enforcement: auto-select earliest expiry batches
                $batches = \App\Models\FEFOBatch::where('product_id', $data['product_id'])
                    ->where('status', 'active')
                    ->where('quantity', '>', 0)
                    ->orderBy('expiry_date')
                    ->get();

                foreach ($batches as $batch) {
                    if ($remainingQty <= 0) break;

                    $takeQty = min($batch->quantity, $remainingQty);
                    $batch->quantity -= $takeQty;
                    if ($batch->quantity <= 0) {
                        $batch->status = 'cleared';
                    }
                    $batch->save();

                    $movements[] = [
                        'batch_id' => $batch->batch_id,
                        'quantity' => $takeQty,
                    ];

                    $remainingQty -= $takeQty;
                }

                if ($remainingQty > 0) {
                    return response()->json(['message' => 'Insufficient stock in active batches.'], 422);
                }
            }

            // Update inventory
            $inventory->current_stock -= $data['quantity'];
            $inventory->stock_status = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
            $inventory->last_updated = now();
            $inventory->save();

            $user = $request->user();

            // Create stock movements for each batch
            foreach ($movements as $movement) {
                StockMovement::create([
                    'business_id'   => $user?->business_id,
                    'branch_id'     => $user?->branch_id,
                    'product_id'    => $data['product_id'],
                    'batch_id'      => $movement['batch_id'],
                    'user_id'       => $user?->User_id ?? 1,
                    'movement_type' => 'Stock Out',
                    'quantity'      => $movement['quantity'],
                    'remarks'       => $data['remarks'] ?? null,
                    'movement_date' => now(),
                ]);
            }

            // Log override if provided
            if (isset($data['override_reason']) && $data['override_reason']) {
                AuditLog::create([
                    'user_id'       => $user?->User_id ?? 1,
                    'action'        => "FEFO Override: Stock-out with reason: {$data['override_reason']}",
                    'entity_type'   => 'Inventory',
                    'entity_id'     => $inventory->inventory_id,
                    'new_values'    => json_encode(['override_reason' => $data['override_reason']]),
                    'created_at'    => now(),
                    'business_id'   => $user?->business_id,
                    'branch_id'     => $user?->branch_id,
                ]);
            }

            AuditLog::create([
                'user_id'       => $user?->User_id ?? 1,
                'action'        => "Stock-out (FEFO): {$data['quantity']} units of {$inventory->product?->product_name}",
                'entity_type'   => 'Inventory',
                'entity_id'     => $inventory->inventory_id,
                'old_values'    => null,
                'new_values'    => json_encode(['current_stock' => $inventory->current_stock, 'batches_used' => $movements]),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json([
                'message' => 'Stock removed (FEFO enforced).',
                'new_stock' => $inventory->current_stock,
                'batches_used' => $movements,
            ]);
        });
    }

    public function movements($id)
    {
        $query = Inventory::with('product');
        $query = $this->scopeForBusinessAndBranch($query, request());
        $inventory = $query->findOrFail($id);

        $query = StockMovement::where('product_id', $inventory->product_id);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $movements = $query->with('user')
            ->orderByDesc('movement_date')
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
            'product_id'    => $inventory->product_id,
            'product_name'  => $inventory->product?->product_name,
            'current_stock' => $inventory->current_stock,
            'movements'     => $movements,
        ]);
    }

    public function allMovements(Request $request)
    {
        $query = StockMovement::with(['product.category', 'user']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($search = $request->input('search')) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($type = $request->input('movement_type')) {
            $query->where('movement_type', $type);
        }

        if ($from = $request->input('from_date')) {
            $query->whereDate('movement_date', '>=', $from);
        }

        if ($to = $request->input('to_date')) {
            $query->whereDate('movement_date', '<=', $to);
        }

        if ($productId = $request->input('product_id')) {
            $query->where('product_id', $productId);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('movement_date')->paginate($perPage)->through(fn ($m) => [
                'movement_id'    => $m->movement_id,
                'product_id'     => $m->product_id,
                'product_name'   => $m->product?->product_name,
                'sku'            => $m->product?->barcode,
                'category'       => $m->product?->category?->Category_name ?? '',
                'movement_type'  => $m->movement_type,
                'quantity'       => $m->quantity,
                'remarks'        => $m->remarks,
                'recorded_by'    => $m->user?->Full_name ?? 'System',
                'movement_date'  => $m->movement_date,
                'business_id'    => $m->business_id,
                'branch_id'      => $m->branch_id,
                'batch_id'       => $m->batch_id,
            ])
        );
    }
}