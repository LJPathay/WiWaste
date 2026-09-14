<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesTransactionController extends Controller
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
        $query = SalesTransaction::with(['user', 'salesItems.product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

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
                'amount_tendered'  => $t->amount_tendered,
                'change_due'       => $t->change_due,
                'status'           => $t->status,
                'business_id'      => $t->business_id,
                'branch_id'        => $t->branch_id,
                'customer_name'    => $t->customer_name,
                'customer_phone'   => $t->customer_phone,
                'customer_email'   => $t->customer_email,
                'senior_pwd_id'    => $t->senior_pwd_id,
                'senior_pwd_type'  => $t->senior_pwd_type,
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

    public function store(Request $request)
    {
        $data = $request->validate([
            'payment_method'             => 'required|in:Cash,E-wallet,Credit Card,Debit Card',
            'payment_reference'          => 'nullable|string|max:100',
            'amount_tendered'            => 'nullable|numeric|min:0',
            'change_due'                 => 'nullable|numeric|min:0',
            'senior_pwd_name'            => 'nullable|string|max:100',
            'senior_pwd_id'              => 'nullable|string|max:50',
            'senior_pwd_type'            => 'nullable|in:senior,pwd,none',
            'customer_name'              => 'nullable|string|max:255',
            'customer_phone'             => 'nullable|string|max:20',
            'customer_email'             => 'nullable|string|max:255',
            'items'                      => 'required|array|min:1',
            'items.*.product_id'         => 'required|integer|exists:Product,product_id',
            'items.*.quantity'           => 'required|integer|min:1',
            'items.*.unit_price'         => 'required|numeric|min:0',
            'items.*.discount_pct'       => 'nullable|numeric|min:0|max:1',
            'items.*.discount_amount'    => 'nullable|numeric|min:0',
            'items.*.override_reason'    => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        $result = DB::transaction(function () use ($data, $userId, $user) {
            $total = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

            $query = Inventory::whereIn('product_id', collect($data['items'])->pluck('product_id'));
            $query = $this->scopeForBusinessAndBranch($query, $request);
            $lockedInventories = $query->with('product')
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
                'payment_reference'  => $data['payment_reference'] ?? null,
                'payment_status'     => 'Paid',
                'amount_tendered'    => $data['amount_tendered'] ?? null,
                'change_due'         => $data['change_due'] ?? null,
                'senior_pwd_name'    => $data['senior_pwd_name'] ?? null,
                'senior_pwd_id'      => $data['senior_pwd_id'] ?? null,
                'senior_pwd_type'    => $data['senior_pwd_type'] ?? 'none',
                'customer_name'      => $data['customer_name'] ?? null,
                'customer_phone'     => $data['customer_phone'] ?? null,
                'customer_email'     => $data['customer_email'] ?? null,
                'status'             => 'Completed',
            ];

            if ($user && $user->business_id) {
                $transactionData['business_id'] = $user->business_id;
            }
            if ($user && $user->branch_id) {
                $transactionData['branch_id'] = $user->branch_id;
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

                $inventory = $lockedInventories->get($item['product_id']);
                if ($inventory) {
                    $inventory->current_stock -= $item['quantity'];
                    $inventory->stock_status  = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                    $inventory->last_updated  = now();
                    $inventory->save();
                }

                StockMovement::create([
                    'business_id'   => $user?->business_id,
                    'branch_id'     => $user?->branch_id,
                    'product_id'    => $item['product_id'],
                    'user_id'       => $userId,
                    'movement_type' => 'Sale',
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
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json([
                'message'        => 'Transaction completed.',
                'transaction_id' => $transaction->transaction_id,
                'total_amount'   => $total,
            ], 201);
        });

        return $result;
    }

    public function show(Request $request, int $id)
    {
        $query = SalesTransaction::with(['user', 'salesItems.product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $transaction = $query->find($id);

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
            'amount_tendered'   => $transaction->amount_tendered,
            'change_due'        => $transaction->change_due,
            'status'            => $transaction->status,
            'business_id'       => $transaction->business_id,
            'branch_id'         => $transaction->branch_id,
            'customer_name'     => $transaction->customer_name,
            'customer_phone'    => $transaction->customer_phone,
            'customer_email'    => $transaction->customer_email,
            'senior_pwd_id'     => $transaction->senior_pwd_id,
            'senior_pwd_type'   => $transaction->senior_pwd_type,
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