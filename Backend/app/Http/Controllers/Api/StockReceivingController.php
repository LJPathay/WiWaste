<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockReceivingController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('Purchase_Order as po')
            ->join('Supplier as s', 'po.supplier_id', '=', 's.supplier_id')
            ->select(
                'po.purchase_order_id as id',
                'po.po_number',
                'po.supplier_id',
                's.supplier_name',
                'po.expected_date',
                'po.status',
                'po.total_amount'
            )
            ->orderByDesc('po.expected_date');

        if ($status = $request->input('status')) {
            $query->where('po.status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id'   => 'required|integer|exists:Supplier,supplier_id',
            'expected_date' => 'required|date',
            'items'         => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:Product,product_id',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_cost'  => 'required|numeric|min:0',
        ]);

        $total = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_cost']);
        $poNumber = 'PO-' . strtoupper(uniqid());

        $po = DB::table('Purchase_Order')->insertGetId([
            'po_number'     => $poNumber,
            'supplier_id'   => $data['supplier_id'],
            'expected_date' => $data['expected_date'],
            'total_amount'  => $total,
            'status'        => 'pending',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        foreach ($data['items'] as $item) {
            DB::table('Purchase_Order_Item')->insert([
                'purchase_order_id' => $po,
                'product_id'        => $item['product_id'],
                'quantity_ordered'  => $item['quantity'],
                'unit_cost'         => $item['unit_cost'],
                'quantity_received' => 0,
            ]);
        }

        return response()->json([
            'message'       => 'Purchase order created.',
            'purchase_order_id' => $po,
            'po_number'     => $poNumber,
        ], 201);
    }

    public function receive(Request $request, $id)
    {
        $data = $request->validate([
            'items'         => 'required|array|min:1',
            'items.*.product_id'      => 'required|integer|exists:Product,product_id',
            'items.*.quantity'        => 'required|integer|min:1',
            'items.*.unit_cost'       => 'required|numeric|min:0',
            'items.*.batch_number'    => 'nullable|string|max:100',
            'items.*.expiration_date' => 'nullable|date',
        ]);

        $po = DB::table('Purchase_Order')->where('purchase_order_id', $id)->first();
        if (!$po) {
            return response()->json(['message' => 'Purchase order not found.'], 404);
        }
        if ($po->status === 'received' || $po->status === 'cancelled') {
            return response()->json(['message' => 'Cannot receive items for this order.'], 422);
        }

        $userId = $request->user()?->User_id ?? 1;

        return DB::transaction(function () use ($data, $id, $userId) {
            foreach ($data['items'] as $item) {
                $inventory = Inventory::where('product_id', $item['product_id'])->first();

                if ($inventory) {
                    $inventory->current_stock += $item['quantity'];
                    $inventory->stock_status  = Inventory::calcStatus(
                        $inventory->current_stock,
                        $inventory->product?->reorder_level ?? 10
                    );
                    $inventory->last_updated  = now();
                    $inventory->save();
                } else {
                    $inventory = Inventory::create([
                        'product_id'    => $item['product_id'],
                        'current_stock' => $item['quantity'],
                        'stock_status'  => 'Normal',
                        'last_updated'  => now(),
                    ]);
                }

                StockMovement::create([
                    'product_id'    => $item['product_id'],
                    'user_id'       => $userId,
                    'movement_type' => 'Stock In',
                    'quantity'      => $item['quantity'],
                    'remarks'       => "Received via PO #{$id}",
                    'movement_date' => now(),
                ]);

                AuditLog::create([
                    'user_id'     => $userId,
                    'action'      => "Received {$item['quantity']} units of product #{$item['product_id']} via PO #{$id}",
                    'entity_type' => 'Inventory',
                    'entity_id'   => $inventory->inventory_id,
                    'new_values'  => json_encode($item),
                    'created_at'  => now(),
                ]);

                DB::table('Purchase_Order_Item')
                    ->where('purchase_order_id', $id)
                    ->where('product_id', $item['product_id'])
                    ->update([
                        'quantity_received' => DB::raw("quantity_received + {$item['quantity']}"),
                        'unit_cost'         => $item['unit_cost'],
                    ]);
            }

            DB::table('Purchase_Order')
                ->where('purchase_order_id', $id)
                ->update(['status' => 'received', 'updated_at' => now()]);

            WarmAnalyticsCache::dispatch();

            return response()->json(['message' => 'Stock received successfully.']);
        });
    }

    public function reject(Request $request, $id)
    {
        $data = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $po = DB::table('Purchase_Order')->where('purchase_order_id', $id)->first();
        if (!$po) {
            return response()->json(['message' => 'Purchase order not found.'], 404);
        }

        DB::table('Purchase_Order')
            ->where('purchase_order_id', $id)
            ->update(['status' => 'cancelled', 'updated_at' => now()]);

        AuditLog::create([
            'user_id'     => $request->user()?->User_id ?? 1,
            'action'      => "Rejected PO #{$id}: {$data['reason']}",
            'entity_type' => 'PurchaseOrder',
            'entity_id'   => $id,
            'new_values'  => json_encode($data),
            'created_at'  => now(),
        ]);

        return response()->json(['message' => 'Order rejected.']);
    }

    public function discard(Request $request, $id)
    {
        $data = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $po = DB::table('Purchase_Order')->where('purchase_order_id', $id)->first();
        if (!$po) {
            return response()->json(['message' => 'Purchase order not found.'], 404);
        }

        DB::table('Purchase_Order')
            ->where('purchase_order_id', $id)
            ->update(['status' => 'cancelled', 'updated_at' => now()]);

        AuditLog::create([
            'user_id'     => $request->user()?->User_id ?? 1,
            'action'      => "Discarded PO #{$id}: {$data['reason']}",
            'entity_type' => 'PurchaseOrder',
            'entity_id'   => $id,
            'new_values'  => json_encode($data),
            'created_at'  => now(),
        ]);

        return response()->json(['message' => 'Order discarded.']);
    }
}
