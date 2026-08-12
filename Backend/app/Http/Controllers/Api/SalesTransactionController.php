<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesTransactionController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            SalesTransaction::with(['user', 'items.product'])->orderByDesc('transaction_date')->paginate($perPage)->through(fn ($t) => [
                'id'               => $t->transaction_id,
                'cashier'          => $t->user?->Full_name ?? 'Cashier',
                'total_amount'     => $t->total_amount,
                'transaction_date' => $t->transaction_date,
                'payment_method'   => $t->payment_method,
                'amount_tendered'  => $t->amount_tendered,
                'change_due'       => $t->change_due,
                'status'           => $t->status,
                'items'            => $t->items->map(fn ($item) => [
                    'id'           => $item->sales_item_id,
                    'product_name' => $item->product?->product_name,
                    'sku'          => $item->product?->barcode,
                    'quantity'     => $item->quantity,
                    'unit_price'   => $item->unit_price,
                    'subtotal'     => $item->subtotal,
                ]),
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'payment_method'             => 'required|in:Cash,E-wallet,Credit Card,Debit Card',
            'amount_tendered'            => 'nullable|numeric|min:0',
            'change_due'                 => 'nullable|numeric|min:0',
            'senior_pwd_name'            => 'nullable|string|max:100',
            'senior_pwd_id'              => 'nullable|string|max:50',
            'items'                      => 'required|array|min:1',
            'items.*.product_id'         => 'required|integer|exists:Product,product_id',
            'items.*.quantity'           => 'required|integer|min:1',
            'items.*.unit_price'         => 'required|numeric|min:0',
            'items.*.discount_pct'       => 'nullable|numeric|min:0|max:1',
            'items.*.discount_amount'    => 'nullable|numeric|min:0',
            'items.*.override_reason'    => 'nullable|string|max:255',
        ]);

        $userId = $request->user()?->User_id ?? 1;

        return DB::transaction(function () use ($data, $userId) {
            $total = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

            // Lock inventory rows inside the transaction and re-check stock so concurrent
            // sales can never push a product below zero.
            $lockedInventories = Inventory::whereIn('product_id', collect($data['items'])->pluck('product_id'))
                ->with('product')
                ->lockForUpdate()
                ->get()
                ->keyBy('product_id');

            foreach ($data['items'] as $item) {
                $inventory = $lockedInventories->get($item['product_id']);
                if (!$inventory) {
                    return response()->json([
                        'message' => "No inventory record for product #{$item['product_id']}.",
                    ], 422);
                }
                if ($inventory->current_stock < $item['quantity']) {
                    $productName = $inventory->product?->product_name ?? "Product #{$item['product_id']}";
                    return response()->json([
                        'message' => "Insufficient stock for {$productName}. Available: {$inventory->current_stock}, requested: {$item['quantity']}.",
                    ], 422);
                }
            }

            $transaction = SalesTransaction::create([
                'user_id'            => $userId,
                'total_amount'       => $total,
                'transaction_date'   => now(),
                'payment_method'     => $data['payment_method'],
                'amount_tendered'    => $data['amount_tendered'] ?? null,
                'change_due'         => $data['change_due'] ?? null,
                'senior_pwd_name'    => $data['senior_pwd_name'] ?? null,
                'senior_pwd_id'      => $data['senior_pwd_id'] ?? null,
                'status'             => 'Completed',
            ]);

            foreach ($data['items'] as $item) {
                $subtotal = $item['quantity'] * $item['unit_price'];

                $saleItem = SalesItem::create([
                    'transaction_id'  => $transaction->transaction_id,
                    'product_id'      => $item['product_id'],
                    'quantity'        => $item['quantity'],
                    'unit_price'      => $item['unit_price'],
                    'original_price'  => ($item['discount_pct'] ?? 0)
                        ? round($item['unit_price'] / (1 - $item['discount_pct']), 2)
                        : null,
                    'subtotal'        => $subtotal,
                    'override_reason' => $item['override_reason'] ?? null,
                ]);

                // Deduct inventory (row already locked for update and validated above)
                $inventory = $lockedInventories->get($item['product_id']);
                if ($inventory) {
                    $inventory->current_stock -= $item['quantity'];
                    $inventory->stock_status  = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                    $inventory->last_updated  = now();
                    $inventory->save();
                }

                // Log stock movement
                StockMovement::create([
                    'product_id'    => $item['product_id'],
                    'user_id'       => $userId,
                    'movement_type' => 'Stock Out',
                    'quantity'      => $item['quantity'],
                    'remarks'       => 'Sale - Txn #' . $transaction->transaction_id,
                    'movement_date' => now(),
                    'sale_item_id'  => $saleItem->sales_item_id,
                ]);
            }

            AuditLog::create([
                'user_id'       => $userId,
                'action'        => "POS sale #{$transaction->transaction_id}: {$total} via {$data['payment_method']}",
                'entity_type'   => 'Sales',
                'entity_id'     => $transaction->transaction_id,
                'old_values'    => null,
                'new_values'    => json_encode(['total' => $total, 'items' => count($data['items'])]),
                'created_at'    => now(),
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json([
                'message'        => 'Transaction completed.',
                'transaction_id' => $transaction->transaction_id,
                'total_amount'   => $total,
            ], 201);
        });
    }
}
