<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use App\Services\PayMongoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesTransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = SalesTransaction::with(['user', 'salesItems.product']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('transaction_id', 'like', "%{$search}%")
                  ->orWhereHas('salesItems.product', fn ($p) => $p->where('product_name', 'like', "%{$search}%"));
            });
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('transaction_date')->paginate($perPage)->through(fn ($t) => [
                'id'               => $t->transaction_id,
                'cashier'          => $t->user?->Full_name ?? 'Cashier',
                'total_amount'     => $t->total_amount,
                'transaction_date' => $t->transaction_date,
                'payment_method'   => $t->payment_method,
                'payment_reference'=> $t->payment_reference,
                'payment_status'   => $t->payment_status,
                'paymongo_intent_id' => $t->paymongo_intent_id,
                'paymongo_checkout_url' => $t->paymongo_checkout_url,
                'amount_tendered'  => $t->amount_tendered,
                'change_due'       => $t->change_due,
                'status'           => $t->status,
                'items'            => $t->salesItems->map(fn ($item) => [
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

    public function store(Request $request, PayMongoService $paymongoService)
    {
        $data = $request->validate([
            'payment_method'             => 'required|in:Cash,E-wallet,Credit Card,Debit Card,PayMongo',
            'payment_reference'          => 'nullable|required_if:payment_method,PayMongo|in:GCash,Maya,Card',
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
        $isPayMongo = $data['payment_method'] === 'PayMongo';

        $result = DB::transaction(function () use ($data, $userId, $isPayMongo) {
            $total = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

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

            $transactionData = [
                'user_id'            => $userId,
                'total_amount'       => $total,
                'transaction_date'   => now(),
                'payment_method'     => $data['payment_method'],
                'amount_tendered'    => $isPayMongo ? $total : ($data['amount_tendered'] ?? null),
                'change_due'         => $isPayMongo ? 0 : ($data['change_due'] ?? null),
                'senior_pwd_name'    => $data['senior_pwd_name'] ?? null,
                'senior_pwd_id'      => $data['senior_pwd_id'] ?? null,
                'status'             => $isPayMongo ? 'Pending' : 'Completed',
            ];

            if ($isPayMongo) {
                $transactionData['payment_status'] = 'pending';
                $transactionData['payment_reference'] = $data['payment_reference'];
            }

            $transaction = SalesTransaction::create($transactionData);

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

                if (!$isPayMongo) {
                    $inventory = $lockedInventories->get($item['product_id']);
                    if ($inventory) {
                        $inventory->current_stock -= $item['quantity'];
                        $inventory->stock_status  = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                        $inventory->last_updated  = now();
                        $inventory->save();
                    }

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
            }

            if (!$isPayMongo) {
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
            }

            return [$transaction, $total, $lockedInventories];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        [$transaction, $total, $lockedInventories] = $result;

        // Create the PayMongo checkout OUTSIDE the DB transaction so the inventory row locks are
        // released before the network round-trip — makes checkout feel faster and avoids blocking
        // other cashiers while the payment provider responds.
        $lineItems = collect($data['items'])->map(function ($item) use ($lockedInventories) {
            $product = $lockedInventories->get($item['product_id'])?->product;
            return [
                'name'        => $product?->product_name ?? "Product #{$item['product_id']}",
                'quantity'    => (int) $item['quantity'],
                'currency'    => 'PHP',
                'amount'      => (int) round($item['quantity'] * $item['unit_price'] * 100),
                'description' => 'WiWaste POS sale',
            ];
        })->values()->all();

        try {
            $session = $paymongoService->createCheckoutSession(
                $lineItems,
                "WiWaste sale #{$transaction->transaction_id}",
                config('services.paymongo.success_url') . '?transaction_id=' . $transaction->transaction_id,
                config('services.paymongo.cancel_url'),
                $data['payment_reference'],
                $transaction->transaction_id
            );
        } catch (\Throwable $e) {
            $transaction->payment_status = 'failed';
            $transaction->save();
            return response()->json(['message' => 'Unable to create the PayMongo checkout. Please try again.'], 502);
        }

        $transaction->paymongo_intent_id = $session['payment_intent_id'] ?? null;
        $transaction->paymongo_checkout_url = $session['checkout_url'] ?? null;
        $transaction->save();

        return response()->json([
            'transaction_id'     => $transaction->transaction_id,
            'checkout_url'       => $transaction->paymongo_checkout_url,
            'payment_intent_id'  => $transaction->paymongo_intent_id,
            'status'             => 'pending',
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $transaction = SalesTransaction::with(['user', 'salesItems.product'])->find($id);
        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found.'], 404);
        }

        return response()->json([
            'id'                => $transaction->transaction_id,
            'cashier'           => $transaction->user?->Full_name ?? 'Cashier',
            'total_amount'      => $transaction->total_amount,
            'transaction_date'  => $transaction->transaction_date,
            'payment_method'    => $transaction->payment_method,
            'payment_reference' => $transaction->payment_reference,
            'payment_status'    => $transaction->payment_status,
            'paymongo_intent_id'=> $transaction->paymongo_intent_id,
            'paymongo_checkout_url' => $transaction->paymongo_checkout_url,
            'amount_tendered'   => $transaction->amount_tendered,
            'change_due'        => $transaction->change_due,
            'status'            => $transaction->status,
            'items'             => $transaction->salesItems->map(fn ($item) => [
                'id'           => $item->sales_item_id,
                'product_name' => $item->product?->product_name,
                'sku'          => $item->product?->barcode,
                'quantity'     => $item->quantity,
                'unit_price'   => $item->unit_price,
                'subtotal'     => $item->subtotal,
            ]),
        ]);
    }
}
