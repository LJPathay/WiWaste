<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\DiscardStockReceivingRequest;
use App\Http\Requests\Api\ReceiveStockReceivingRequest;
use App\Http\Requests\Api\RejectStockReceivingRequest;
use App\Http\Requests\Api\StoreStockReceivingRequest;
use App\Http\Requests\Api\UpdateStockReceivingRequest;
use App\Http\Requests\Api\VerifyStockReceivingRequest;
use App\Http\Resources\StockReceivingResource;
use App\Models\AuditLog;
use App\Models\FEFOBatch;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\StockReceiving;
use App\Models\StockReceivingItem;
use Illuminate\Http\Request;

class StockReceivingController extends Controller
{
    use ScopesTenant;

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
                ->through(fn ($r) => (new StockReceivingResource($r))->resolve($request))
        );
    }

    public function store(StoreStockReceivingRequest $request)
    {
        $user = $request->user();

        $data = $request->validated();

        $this->applyReceivingDefaults($data, $user);
        $receiving = StockReceiving::create($data);
        $this->createReceivingItems($receiving, $data['items'] ?? []);
        $this->logAudit($user, "Created stock receiving record for supplier #{$receiving->supplier_id}", $receiving, null, $data);

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock receiving record created.',
            'receiving' => (new StockReceivingResource($receiving))->resolve($request),
        ], 201);
    }

    public function receive(ReceiveStockReceivingRequest $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        if (! in_array($receiving->status, ['pending', 'received', 'partial'])) {
            return response()->json(['message' => 'Cannot receive in current status.'], 422);
        }

        $data = $request->validated();

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
            'receiving' => (new StockReceivingResource($receiving))->resolve($request),
            'temperature_warnings' => $warnings,
        ]);
    }

    public function show($id)
    {
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $receiving = $query->findOrFail($id);

        return response()->json((new StockReceivingResource($receiving))->resolve(request()));
    }

    public function update(UpdateStockReceivingRequest $request, $id)
    {
        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validated();

        $receiving->update($data);

        $this->logAudit($request->user(), "Updated stock receiving record #{$receiving->receiving_id}", $receiving, $receiving->getOriginal(), $data);

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock receiving record updated.',
            'receiving' => (new StockReceivingResource($receiving))->resolve($request),
        ]);
    }

    public function verify(VerifyStockReceivingRequest $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validated();

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
            'receiving' => (new StockReceivingResource($receiving))->resolve($request),
            'temperature_warnings' => $warnings,
        ]);
    }

    public function reject(RejectStockReceivingRequest $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validated();

        $receiving->update([
            'status' => 'rejected',
            'notes' => ($receiving->notes ? $receiving->notes."\n" : '')."Rejected: {$data['reason']}",
        ]);

        $this->logAudit($user, "Rejected stock receiving record #{$receiving->receiving_id}: {$data['reason']}", $receiving, null, $data);

        return response()->json(['message' => 'Order rejected.']);
    }

    public function discard(DiscardStockReceivingRequest $request, $id)
    {
        $user = $request->user();

        $query = StockReceiving::with(['supplier', 'receiver', 'verifier']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $receiving = $query->findOrFail($id);

        $data = $request->validated();

        $receiving->update([
            'status' => 'rejected',
            'notes' => ($receiving->notes ? $receiving->notes."\n" : '')."Discarded: {$data['reason']}",
        ]);

        $this->logAudit($user, "Discarded stock receiving record #{$receiving->receiving_id}: {$data['reason']}", $receiving, null, $data);

        return response()->json(['message' => 'Order discarded.']);
    }

    protected function applyReceivingDefaults(array &$data, $user): void
    {
        $data['business_id'] = $data['business_id'] ?? $user?->business_id;
        $data['branch_id'] = $data['branch_id'] ?? $user?->branch_id;
        $data['received_by'] = $data['received_by'] ?? $user?->User_id;
        $data['received_at'] ??= now();
        $data['status'] ??= 'received';
    }

    protected function createReceivingItems(StockReceiving $receiving, array $items): void
    {
        foreach ($items as $itemData) {
            $itemData['receiving_id'] = $receiving->receiving_id;
            $itemData += [
                'received_quantity' => 0,
                'rejected_quantity' => 0,
                'condition_check_passed' => true,
                'sanitation_check_passed' => true,
                'status' => 'pending',
            ];
            StockReceivingItem::create($itemData);
        }
    }

    protected function validateTemperature(StockReceivingItem $item, array &$itemData): ?string
    {
        $product = $item->product;
        $warning = null;

        if ($product && ! empty($itemData['temperature_at_receipt'])) {
            $temp = $itemData['temperature_at_receipt'];

            if ($product->required_temp_min !== null && $temp < $product->required_temp_min) {
                $itemData['condition_check_passed'] = false;
                $warning = "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$temp}Â°C is below required minimum {$product->required_temp_min}Â°C";
            } elseif ($product->required_temp_max !== null && $temp > $product->required_temp_max) {
                $itemData['condition_check_passed'] = false;
                $warning = "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$temp}Â°C exceeds required maximum {$product->required_temp_max}Â°C";
            }
        }

        return $warning;
    }

    protected function processReceiveItems(StockReceiving $receiving, array $items, $user): array
    {
        $warnings = [];

        foreach ($items as $itemData) {
            $item = $receiving->items()->find($itemData['receiving_item_id']);
            if (! $item) {
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

        if (! $items || ! is_array($items)) {
            return $warnings;
        }

        foreach ($items as $itemData) {
            $item = $receiving->items()->find($itemData['receiving_item_id']);
            if (! $item) {
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
        if (! empty($warnings)) {
            $data['notes'] = ($data['notes'] ?? '')."\n\nTEMPERATURE WARNINGS:\n".implode("\n", $warnings);
        }
    }

    protected function logAudit($user, string $action, $entity, ?array $oldValues, array $newValues): void
    {
        AuditLog::create([
            'user_id' => $user?->User_id ?? 1,
            'action' => $action,
            'entity_type' => 'Stock_Receiving',
            'entity_id' => $entity->receiving_id,
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => json_encode($newValues),
            'created_at' => now(),
            'business_id' => $user?->business_id,
            'branch_id' => $user?->branch_id,
        ]);
    }

    protected function createBatchAndStockMovement(StockReceivingItem $item, int $quantity, $user): void
    {
        $batch = FEFOBatch::create([
            'business_id' => $item->receiving->business_id,
            'branch_id' => $item->receiving->branch_id,
            'product_id' => $item->product_id,
            'batch_number' => $item->batch_id ? FEFOBatch::find($item->batch_id)?->batch_number : 'BATCH-'.now()->format('YmdHis'),
            'quantity' => $quantity,
            'expiry_date' => $item->product?->expiration_date ?? now()->addYear(),
            'status' => 'active',
            'received_date' => now()->toDateString(),
            'received_temperature' => $item->temperature_at_receipt,
            'supplier_batch_number' => $item->batch_id ? FEFOBatch::find($item->batch_id)?->supplier_batch_number : null,
            'created_by' => $user?->User_id ?? 1,
            'created_at' => now(),
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
            'remarks' => 'Stock received via receiving #'.$item->receiving->receiving_id,
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
