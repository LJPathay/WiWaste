<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\StockReceiving;
use App\Models\StockReceivingItem;
use App\Models\FEFOBatch;
use App\Models\AuditLog;
use Illuminate\Http\Request;

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
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
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
            'items'             => 'sometimes|array',
            'items.*.product_id'      => 'required|integer|exists:Product,product_id',
            'items.*.batch_id'        => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'items.*.po_item_id'      => 'nullable|integer|exists:Purchase_Order_Item,po_item_id',
            'items.*.expected_quantity' => 'required|integer|min:1',
            'items.*.received_quantity' => 'nullable|integer|min:0',
            'items.*.rejected_quantity' => 'nullable|integer|min:0',
            'items.*.unit_cost'       => 'nullable|numeric|min:0',
            'items.*.temperature_at_receipt' => 'nullable|numeric',
            'items.*.condition_check_passed' => 'nullable|boolean',
            'items.*.sanitation_check_passed' => 'nullable|boolean',
            'items.*.status'          => 'nullable|in:pending,received,partial,rejected',
            'items.*.notes'           => 'nullable|string|max:500',
        ]);

        $this->applyReceivingDefaults($data, $user);
        $receiving = StockReceiving::create($data);
        $this->createReceivingItems($receiving, $data['items'] ?? []);
        $this->logAudit($user, "Created stock receiving record for supplier #{$receiving->supplier_id}", $receiving, null, $data);

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock receiving record created.',
            'receiving' => $receiving,
        ], 201);
    }

    public function receive(Request $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        if (!in_array($receiving->status, ['pending', 'received', 'partial'])) {
            return response()->json(['message' => 'Cannot receive in current status.'], 422);
        }

        $data = $request->validate([
            'received_by' => 'sometimes|integer|exists:User,User_id',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.receiving_item_id' => 'required|integer|exists:stock_receiving_items,receiving_item_id',
            'items.*.temperature_at_receipt' => 'nullable|numeric',
            'items.*.condition_check_passed' => 'nullable|boolean',
            'items.*.sanitation_check_passed' => 'nullable|boolean',
            'items.*.received_quantity' => 'required|integer|min:1',
            'items.*.rejected_quantity' => 'nullable|integer|min:0',
            'items.*.notes' => 'nullable|string|max:500',
        ]);

        $data['received_by'] = $data['received_by'] ?? $user?->User_id;
        $data['received_at'] = now();

        $warnings = $this->processReceiveItems($receiving, $data['items'], $user);

        $data['status'] = 'received';
        $this->appendTemperatureWarnings($data, $warnings);
        $receiving->update($data);

        $this->logAudit($user, "Received stock for receiving record #{$receiving->receiving_id}", $receiving, $receiving->getOriginal(), $data);

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock received successfully.',
            'receiving' => $receiving,
            'temperature_warnings' => $warnings,
        ]);
    }

    public function show($id)
    {
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $receiving = $query->findOrFail($id);

        return response()->json($receiving);
    }

    public function update(Request $request, $id)
    {
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
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

        $this->logAudit($request->user(), "Updated stock receiving record #{$receiving->receiving_id}", $receiving, $receiving->getOriginal(), $data);

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock receiving record updated.',
            'receiving' => $receiving,
        ]);
    }

    public function verify(Request $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validate([
            'verified_by' => 'sometimes|integer|exists:User,User_id',
            'notes' => 'nullable|string|max:500',
            'items' => 'sometimes|array',
            'items.*.receiving_item_id' => 'required|integer|exists:stock_receiving_items,receiving_item_id',
            'items.*.temperature_at_receipt' => 'nullable|numeric',
            'items.*.condition_check_passed' => 'nullable|boolean',
            'items.*.sanitation_check_passed' => 'nullable|boolean',
            'items.*.received_quantity' => 'nullable|integer|min:0',
            'items.*.rejected_quantity' => 'nullable|integer|min:0',
            'items.*.status' => 'nullable|in:pending,received,partial,rejected',
            'items.*.notes' => 'nullable|string|max:500',
        ]);

        $data['verified_by'] = $data['verified_by'] ?? $user?->User_id;
        $data['verified_at'] = now();
        $data['status'] = 'verified';

        $warnings = $this->processVerifyItems($receiving, $data['items'] ?? null, $user);
        $this->appendTemperatureWarnings($data, $warnings);
        $receiving->update($data);

        $this->logAudit($user, "Verified stock receiving record #{$receiving->receiving_id}", $receiving, $receiving->getOriginal(), $data);

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock receiving record verified.',
            'receiving' => $receiving,
            'temperature_warnings' => $warnings,
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

        $this->logAudit($user, "Rejected stock receiving record #{$receiving->receiving_id}: {$data['reason']}", $receiving, null, $data);

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

        $this->logAudit($user, "Discarded stock receiving record #{$receiving->receiving_id}: {$data['reason']}", $receiving, null, $data);

        return response()->json(['message' => 'Order discarded.']);
    }

    protected function applyReceivingDefaults(array &$data, $user): void
    {
        $data['business_id']  = $data['business_id']  ?? $user?->business_id;
        $data['branch_id']    = $data['branch_id']    ?? $user?->branch_id;
        $data['received_by']  = $data['received_by']  ?? $user?->User_id;
        $data['received_at'] ??= now();
        $data['status']      ??= 'received';
    }

    protected function createReceivingItems(StockReceiving $receiving, array $items): void
    {
        foreach ($items as $itemData) {
            $itemData['receiving_id'] = $receiving->receiving_id;
            $itemData += [
                'received_quantity'       => 0,
                'rejected_quantity'       => 0,
                'condition_check_passed'  => true,
                'sanitation_check_passed' => true,
                'status'                  => 'pending',
            ];
            StockReceivingItem::create($itemData);
        }
    }

    protected function validateTemperature(StockReceivingItem $item, array &$itemData): ?string
    {
        $product = $item->product;
        if (!$product || empty($itemData['temperature_at_receipt'])) {
            return null;
        }

        $temp = $itemData['temperature_at_receipt'];

        if ($product->required_temp_min !== null && $temp < $product->required_temp_min) {
            $itemData['condition_check_passed'] = false;
            return "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$temp}°C is below required minimum {$product->required_temp_min}°C";
        }

        if ($product->required_temp_max !== null && $temp > $product->required_temp_max) {
            $itemData['condition_check_passed'] = false;
            return "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$temp}°C exceeds required maximum {$product->required_temp_max}°C";
        }

        return null;
    }

    protected function processReceiveItems(StockReceiving $receiving, array $items, $user): array
    {
        $warnings = [];

        foreach ($items as $itemData) {
            $item = $receiving->items()->find($itemData['receiving_item_id']);
            if (!$item) {
                continue;
            }

            $warning = $this->validateTemperature($item, $itemData);
            if ($warning) {
                $warnings[] = $warning;
            }

            $itemData['received_at'] = now();
            $item->update($itemData);

            if ($itemData['received_quantity'] > 0) {
                $this->createBatchAndStockMovement($item, $itemData['received_quantity'], $user);
            }
        }

        return $warnings;
    }

    protected function processVerifyItems(StockReceiving $receiving, ?array $items, $user): array
    {
        $warnings = [];

        if (!$items || !is_array($items)) {
            return $warnings;
        }

        foreach ($items as $itemData) {
            $item = $receiving->items()->find($itemData['receiving_item_id']);
            if (!$item) {
                continue;
            }

            $itemData['verified_at'] = now();
            $item->update($itemData);

            $warning = $this->validateTemperature($item, $itemData);
            if ($warning) {
                $warnings[] = $warning;
                $item->condition_check_passed = false;
                $item->save();
            }

            if (isset($itemData['received_quantity']) && $itemData['received_quantity'] > 0) {
                $this->createBatchAndStockMovement($item, $itemData['received_quantity'], $user);
            }
        }

        return $warnings;
    }

    protected function appendTemperatureWarnings(array &$data, array $warnings): void
    {
        if (!empty($warnings)) {
            $data['notes'] = ($data['notes'] ?? '') . "\n\nTEMPERATURE WARNINGS:\n" . implode("\n", $warnings);
        }
    }

    protected function logAudit($user, string $action, $entity, ?array $oldValues, array $newValues): void
    {
        AuditLog::create([
            'user_id'     => $user?->User_id ?? 1,
            'action'      => $action,
            'entity_type' => 'Stock_Receiving',
            'entity_id'   => $entity->receiving_id,
            'old_values'  => $oldValues ? json_encode($oldValues) : null,
            'new_values'  => json_encode($newValues),
            'created_at'  => now(),
            'business_id' => $user?->business_id,
            'branch_id'   => $user?->branch_id,
        ]);
    }

    protected function createBatchAndStockMovement(StockReceivingItem $item, int $quantity, $user): void
    {
        $batch = FEFOBatch::create([
            'business_id' => $item->receiving->business_id,
            'branch_id' => $item->receiving->branch_id,
            'product_id' => $item->product_id,
            'batch_number' => $item->batch_id ? \App\Models\FEFOBatch::find($item->batch_id)?->batch_number : 'BATCH-' . now()->format('YmdHis'),
            'quantity' => $quantity,
            'expiry_date' => $item->product?->expiration_date ?? now()->addYear(),
            'status' => 'active',
            'received_date' => now()->toDateString(),
            'received_temperature' => $item->temperature_at_receipt,
            'supplier_batch_number' => $item->batch_id ? \App\Models\FEFOBatch::find($item->batch_id)?->supplier_batch_number : null,
            'created_by' => $user?->User_id ?? 1,
        ]);

        $item->update(['batch_id' => $batch->batch_id, 'status' => 'received']);

        StockMovement::create([
            'business_id' => $item->receiving->business_id,
            'branch_id' => $item->receiving->branch_id,
            'product_id' => $item->product_id,
            'batch_id' => $batch->batch_id,
            'user_id' => $user?->User_id ?? 1,
            'movement_type' => 'Stock In',
            'quantity' => $quantity,
            'remarks' => 'Stock received via receiving #' . $item->receiving->receiving_id,
            'movement_date' => now(),
        ]);

        $inventory = Inventory::where('product_id', $item->product_id)
            ->where('business_id', $item->receiving->business_id)
            ->where('branch_id', $item->receiving->branch_id)
            ->first();

        if ($inventory) {
            $inventory->current_stock += $quantity;
            $inventory->stock_status = Inventory::calcStatus($inventory->current_stock, $item->product?->reorder_level ?? 10);
            $inventory->last_updated = now();
            $inventory->save();
        }
    }
}
