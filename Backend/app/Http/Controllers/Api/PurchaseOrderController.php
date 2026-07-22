<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Inventory;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::with('supplier', 'user', 'items.product');

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

        return response()->json($orders->through(fn ($po) => [
            'id' => $po->po_id,
            'po_number' => $po->po_number,
            'supplier_id' => $po->supplier_id,
            'supplier' => $po->supplier?->supplier_name,
            'user' => $po->user?->Full_name,
            'status' => $po->status,
            'total_amount' => (float) $po->total_amount,
            'notes' => $po->notes,
            'items' => $po->items->map(fn ($i) => [
                'id' => $i->po_item_id,
                'product_id' => $i->product_id,
                'product' => $i->product?->product_name,
                'quantity' => $i->quantity,
                'unit_price' => (float) $i->unit_price,
                'subtotal' => (float) $i->subtotal,
                'received_qty' => $i->received_qty,
            ]),
            'created_at' => $po->created_at,
            'updated_at' => $po->updated_at,
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => 'required|integer|exists:Supplier,supplier_id',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:Product,product_id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $poNumber = 'PO-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
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

        $po = PurchaseOrder::create([
            'supplier_id' => $data['supplier_id'],
            'user_id' => $request->user()?->User_id ?? 1,
            'po_number' => $poNumber,
            'status' => 'Draft',
            'total_amount' => $totalAmount,
            'notes' => $data['notes'] ?? null,
            'created_at' => now(),
        ]);

        $po->items()->saveMany($poItems);

        return response()->json([
            'message' => 'Purchase order created.',
            'id' => $po->po_id,
            'po_number' => $poNumber,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $po = PurchaseOrder::findOrFail($id);

        $data = $request->validate([
            'status' => 'sometimes|in:Draft,Ordered,Partially Received,Received,Cancelled',
        ]);

        if (isset($data['status'])) {
            $allowedTransitions = [
                'Draft' => ['Ordered', 'Cancelled'],
                'Ordered' => ['Partially Received', 'Received', 'Cancelled'],
                'Partially Received' => ['Received', 'Cancelled'],
            ];

            $current = $po->status;
            if ($current !== $data['status'] && !in_array($data['status'], $allowedTransitions[$current] ?? [])) {
                return response()->json(['message' => "Cannot transition from {$current} to {$data['status']}."], 422);
            }

            $po->status = $data['status'];
            $po->updated_at = now();
            $po->save();
        }

        return response()->json(['message' => 'Purchase order updated.', 'status' => $po->status]);
    }

    public function receive(Request $request, $id)
    {
        $po = PurchaseOrder::with('items')->findOrFail($id);

        if (!in_array($po->status, ['Ordered', 'Partially Received'])) {
            return response()->json(['message' => 'Only Ordered or Partially Received orders can receive stock.'], 422);
        }

        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.po_item_id' => 'required|integer|exists:Purchase_Order_Item,po_item_id',
            'items.*.received_qty' => 'required|integer|min:0',
        ]);

        $allFullyReceived = true;
        $anyReceived = false;

        foreach ($data['items'] as $itemData) {
            $poItem = $po->items->firstWhere('po_item_id', $itemData['po_item_id']);
            if (!$poItem) continue;

            $newReceived = min($itemData['received_qty'], $poItem->quantity);
            $prevReceived = $poItem->received_qty;
            $additionalQty = $newReceived - $prevReceived;

            if ($additionalQty > 0) {
                $poItem->update(['received_qty' => $newReceived]);
                $anyReceived = true;

                $inventory = Inventory::firstOrCreate(
                    ['product_id' => $poItem->product_id],
                    ['current_stock' => 0, 'stock_status' => 'Normal', 'last_updated' => now()]
                );

                $inventory->current_stock += $additionalQty;
                $inventory->stock_status = $inventory->current_stock > ($inventory->product?->reorder_level ?? 10) * 5
                    ? 'Overstock' : ($inventory->current_stock <= ($inventory->product?->reorder_level ?? 10) ? 'Low Stock' : 'Normal');
                $inventory->last_updated = now();
                $inventory->save();

                StockMovement::create([
                    'product_id' => $poItem->product_id,
                    'user_id' => $request->user()?->User_id ?? 1,
                    'movement_type' => 'Stock In',
                    'quantity' => $additionalQty,
                    'remarks' => "PO receive: {$po->po_number}",
                    'movement_date' => now(),
                ]);
            }

            if ($poItem->received_qty < $poItem->quantity) {
                $allFullyReceived = false;
            }
        }

        if ($anyReceived) {
            $po->status = $allFullyReceived ? 'Received' : 'Partially Received';
            $po->updated_at = now();
            $po->save();
        }

        return response()->json(['message' => 'Stock received.', 'status' => $po->status]);
    }

    public function show($id)
    {
        $po = PurchaseOrder::with('supplier', 'user', 'items.product')->findOrFail($id);
        return response()->json([
            'id' => $po->po_id,
            'po_number' => $po->po_number,
            'supplier_id' => $po->supplier_id,
            'supplier' => $po->supplier?->supplier_name,
            'user' => $po->user?->Full_name,
            'status' => $po->status,
            'total_amount' => (float) $po->total_amount,
            'notes' => $po->notes,
            'items' => $po->items->map(fn ($i) => [
                'id' => $i->po_item_id,
                'product_id' => $i->product_id,
                'product' => $i->product?->product_name,
                'quantity' => $i->quantity,
                'unit_price' => (float) $i->unit_price,
                'subtotal' => (float) $i->subtotal,
                'received_qty' => $i->received_qty,
            ]),
            'created_at' => $po->created_at,
            'updated_at' => $po->updated_at,
        ]);
    }
}
