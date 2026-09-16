<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockReceiving;
use App\Models\StockReceivingItem;
use App\Models\FEFOBatch;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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

        // Create receiving items if provided
        if (isset($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $itemData) {
                $itemData['receiving_id'] = $receiving->receiving_id;
                if (!isset($itemData['received_quantity'])) {
                    $itemData['received_quantity'] = 0;
                }
                if (!isset($itemData['rejected_quantity'])) {
                    $itemData['rejected_quantity'] = 0;
                }
                if (!isset($itemData['condition_check_passed'])) {
                    $itemData['condition_check_passed'] = true;
                }
                if (!isset($itemData['sanitation_check_passed'])) {
                    $itemData['sanitation_check_passed'] = true;
                }
                if (!isset($itemData['status'])) {
                    $itemData['status'] = 'pending';
                }
                StockReceivingItem::create($itemData);
            }
        }

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

        if (!isset($data['received_by']) && $user && $user->User_id) {
            $data['received_by'] = $user->User_id;
        }
        if (!isset($data['received_at'])) {
            $data['received_at'] = now();
        }

        // Process each item with temperature/condition validation
        $temperatureWarnings = [];

        foreach ($data['items'] as $itemData) {
            $item = $receiving->items()->find($itemData['receiving_item_id']);
            if (!$item) {
                continue;
            }

            // Temperature validation against product requirements
            if (isset($itemData['temperature_at_receipt']) && $itemData['temperature_at_receipt'] !== null) {
                $product = $item->product;
                if ($product) {
                    if ($product->required_temp_min !== null && $itemData['temperature_at_receipt'] < $product->required_temp_min) {
                        $temperatureWarnings[] = "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$itemData['temperature_at_receipt']}°C is below required minimum {$product->required_temp_min}°C";
                        $itemData['condition_check_passed'] = false;
                    }
                    if ($product->required_temp_max !== null && $itemData['temperature_at_receipt'] > $product->required_temp_max) {
                        $temperatureWarnings[] = "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$itemData['temperature_at_receipt']}°C exceeds required maximum {$product->required_temp_max}°C";
                        $itemData['condition_check_passed'] = false;
                    }
                }
            }

            // Update item
            $itemData['received_at'] = now();
            $item->update($itemData);

            // If received quantity provided, create FEFO batch and stock movement
            if ($itemData['received_quantity'] > 0) {
                $this->createBatchAndStockMovement($item, $itemData['received_quantity'], $user);
            }
        }

        $data['status'] = 'received';

        if (!empty($temperatureWarnings)) {
            $data['notes'] = ($data['notes'] ?? '') . "\n\nTEMPERATURE WARNINGS:\n" . implode("\n", $temperatureWarnings);
        }

        $receiving->update($data);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Received stock for receiving record #{$receiving->receiving_id}",
            'entity_type'   => 'Stock_Receiving',
            'entity_id'     => $receiving->receiving_id,
            'old_values'    => json_encode($receiving->getOriginal()),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock received successfully.',
            'receiving' => $receiving,
            'temperature_warnings' => $temperatureWarnings ?? [],
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

        if (!isset($data['verified_by']) && $user && $user->User_id) {
            $data['verified_by'] = $user->User_id;
        }
        $data['verified_at'] = now();
        $data['status'] = 'verified';

        // Temperature monitoring: check against product requirements per item
        $temperatureWarnings = [];
        $itemUpdates = [];

        if (isset($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $itemData) {
                $item = $receiving->items()->find($itemData['receiving_item_id']);
                if (!$item) {
                    continue;
                }

                // Update item with provided data
                $itemData['verified_at'] = now();
                $item->update($itemData);
                $itemUpdates[] = $item;

                // Temperature validation against product requirements
                if (isset($itemData['temperature_at_receipt']) && $itemData['temperature_at_receipt'] !== null) {
                    $product = $item->product;
                    if ($product) {
                        if ($product->required_temp_min !== null && $itemData['temperature_at_receipt'] < $product->required_temp_min) {
                            $temperatureWarnings[] = "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$itemData['temperature_at_receipt']}°C is below required minimum {$product->required_temp_min}°C";
                            $item->condition_check_passed = false;
                            $item->save();
                        }
                        if ($product->required_temp_max !== null && $itemData['temperature_at_receipt'] > $product->required_temp_max) {
                            $temperatureWarnings[] = "Item {$item->receiving_item_id} ({$product->product_name}): Temperature {$itemData['temperature_at_receipt']}°C exceeds required maximum {$product->required_temp_max}°C";
                            $item->condition_check_passed = false;
                            $item->save();
                        }
                    }
                }

                // If received quantity provided, create FEFO batch and stock movement
                if (isset($itemData['received_quantity']) && $itemData['received_quantity'] > 0) {
                    $this->createBatchAndStockMovement($item, $itemData['received_quantity'], $user);
                }
            }
        }

        if (!empty($temperatureWarnings)) {
            $data['notes'] = ($data['notes'] ?? '') . "\n\nTEMPERATURE WARNINGS:\n" . implode("\n", $temperatureWarnings);
        }

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

        $receiving->load(['supplier', 'receiver', 'verifier', 'items.product', 'items.batch']);

        return response()->json([
            'message' => 'Stock receiving record verified.',
            'receiving' => $receiving,
            'temperature_warnings' => $temperatureWarnings ?? [],
        ]);
    }

    /**
     * Create FEFO batch and stock movement for received items
     */
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

        // Update item with batch reference
        $item->update(['batch_id' => $batch->batch_id, 'status' => 'received']);

        // Create stock movement
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

        // Update inventory
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