<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ReceivePurchaseOrderRequest;
use App\Http\Requests\Api\StorePurchaseOrderRequest;
use App\Http\Requests\Api\UpdatePurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\FEFOBatch;
use App\Models\Inventory;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    use ScopesTenant;

    public function index(Request $request)
    {
        $query = PurchaseOrder::with('supplier', 'user', 'items.product');
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', fn ($s) => $s->where('supplier_name', 'like', "%{$search}%"));
            });
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($orders->through(fn ($po) => (new PurchaseOrderResource($po))->resolve($request)));
    }

    public function store(StorePurchaseOrderRequest $request)
    {
        $user = $request->user();

        $data = $request->validated();

        // Auto-assign business_id and branch_id from user if not provided
        if (! isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }
        if (! isset($data['branch_id']) && $user && $user->branch_id) {
            $data['branch_id'] = $user->branch_id;
        }

        $poNumber = 'PO-'.now()->format('Ymd').'-'.strtoupper(substr(uniqid(), -6));
        $totalAmount = 0;
        $poItems = [];

        foreach ($data['items'] as $item) {
            $subtotal = $item['quantity'] * $item['unit_price'];
            $totalAmount += $subtotal;
            $poItems[] = new PurchaseOrderItem([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'subtotal' => $subtotal,
                'received_qty' => 0,
            ]);
        }

        $poData = [
            'supplier_id' => $data['supplier_id'],
            'user_id' => $user?->User_id ?? 1,
            'po_number' => $poNumber,
            'status' => 'Draft',
            'total_amount' => $totalAmount,
            'notes' => $data['notes'] ?? null,
            'created_at' => now(),
        ];

        if ($user && $user->business_id) {
            $poData['business_id'] = $user->business_id;
        }
        if ($user && $user->branch_id) {
            $poData['branch_id'] = $user->branch_id;
        }

        $po = PurchaseOrder::create($poData);
        $po->items()->saveMany($poItems);

        return response()->json([
            'message' => 'Purchase order created.',
            'id' => $po->po_id,
            'po_number' => $poNumber,
        ], 201);
    }

    public function update(UpdatePurchaseOrderRequest $request, $id)
    {
        $po = $this->findScoped(PurchaseOrder::class, $id, ['supplier', 'user', 'items.product']);

        $data = $request->validated();

        if (isset($data['status'])) {
            $allowedTransitions = [
                'Draft' => ['Ordered', 'Cancelled'],
                'Ordered' => ['Partially Received', 'Received', 'Cancelled'],
                'Partially Received' => ['Received', 'Cancelled'],
            ];

            $current = $po->status;
            if ($current !== $data['status'] && ! in_array($data['status'], $allowedTransitions[$current] ?? [])) {
                return response()->json(['message' => "Cannot transition from {$current} to {$data['status']}."], 422);
            }

            $po->status = $data['status'];
            $po->updated_at = now();
            $po->save();
        }

        return response()->json(['message' => 'Purchase order updated.', 'status' => $po->status]);
    }

    public function receive(ReceivePurchaseOrderRequest $request, $id)
    {
        $po = $this->findScoped(PurchaseOrder::class, $id, ['items']);

        if (! in_array($po->status, ['Ordered', 'Partially Received'])) {
            return response()->json(['message' => 'Only Ordered or Partially Received orders can receive stock.'], 422);
        }

        $data = $request->validated();
        $user = $request->user();

        $lineTotals = ['allFullyReceived' => true, 'anyReceived' => false];

        foreach ($data['items'] as $itemData) {
            $poItem = $po->items->firstWhere('po_item_id', $itemData['po_item_id']);
            if (! $poItem) {
                continue;
            }

            $newReceived = min($itemData['received_qty'], $poItem->quantity);
            $additionalQty = $newReceived - $poItem->received_qty;

            if ($additionalQty > 0) {
                $poItem->update(['received_qty' => $newReceived]);
                $lineTotals['anyReceived'] = true;

                $this->receiveLine($po, $poItem, $additionalQty, $user, $request);
            }

            if ($poItem->received_qty < $poItem->quantity) {
                $lineTotals['allFullyReceived'] = false;
            }
        }

        if ($lineTotals['anyReceived']) {
            $po->status = $lineTotals['allFullyReceived'] ? 'Received' : 'Partially Received';
            $po->updated_at = now();
            $po->save();
        }

        return response()->json(['message' => 'Stock received.', 'status' => $po->status]);
    }

    /**
     * Books one purchase-order line against inventory: raises the stock level,
     * opens the FEFO batch it landed in, and records the Stock In movement.
     */
    protected function receiveLine(PurchaseOrder $po, $poItem, int $additionalQty, $user, Request $request): void
    {
        $query = Inventory::where('product_id', $poItem->product_id);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $inventory = $query->firstOrCreate(
            ['product_id' => $poItem->product_id],
            ['current_stock' => 0, 'stock_status' => 'Normal', 'last_updated' => now()]
        );

        $inventory->current_stock += $additionalQty;
        $reorderLevel = $inventory->product?->reorder_level ?? 10;
        if ($inventory->current_stock > $reorderLevel * 5) {
            $inventory->stock_status = 'Overstock';
        } elseif ($inventory->current_stock <= $reorderLevel) {
            $inventory->stock_status = 'Low Stock';
        } else {
            $inventory->stock_status = 'Normal';
        }
        $inventory->last_updated = now();
        $inventory->save();

        // Create FEFO batch for received stock
        $batch = FEFOBatch::create([
            'business_id' => $user?->business_id,
            'branch_id' => $user?->branch_id,
            'product_id' => $poItem->product_id,
            'batch_number' => 'PO-'.$po->po_number,
            'quantity' => $additionalQty,
            'expiry_date' => $poItem->product?->expiration_date ?? now()->addYear(),
            'status' => 'active',
            'received_date' => now()->toDateString(),
            'supplier_batch_number' => $poItem->product?->barcode,
            'created_by' => $user?->User_id ?? 1,
            'created_at' => now(),
        ]);

        StockMovement::create([
            'business_id' => $user?->business_id,
            'branch_id' => $user?->branch_id,
            'product_id' => $poItem->product_id,
            'batch_id' => $batch->batch_id,
            'user_id' => $user?->User_id ?? 1,
            'movement_type' => 'Stock In',
            'quantity' => $additionalQty,
            'remarks' => "PO receive: {$po->po_number}",
            'movement_date' => now(),
        ]);
    }

    public function show($id)
    {
        $po = $this->findScoped(PurchaseOrder::class, $id, ['supplier', 'user', 'items.product']);

        return (new PurchaseOrderResource($po))->resolve(request());
    }
}
