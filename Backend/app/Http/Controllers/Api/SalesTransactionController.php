<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\Inventory;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesTransactionController extends Controller
{
    public function index()
    {
        return response()->json(
            SalesTransaction::with(['user', 'items.product'])->orderByDesc('transaction_date')->get()->map(fn ($t) => [
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
            'payment_method'         => 'required|in:Cash,E-wallet,Credit Card,Debit Card',
            'amount_tendered'        => 'nullable|numeric|min:0',
            'change_due'             => 'nullable|numeric|min:0',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'required|integer|exists:Product,product_id',
            'items.*.quantity'       => 'required|integer|min:1',
            'items.*.unit_price'     => 'required|numeric|min:0',
        ]);

        $userId = $request->user()?->User_id ?? 1;

        return DB::transaction(function () use ($data, $userId) {
            $total = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

            $transaction = SalesTransaction::create([
                'user_id'          => $userId,
                'total_amount'     => $total,
                'transaction_date' => now(),
                'payment_method'   => $data['payment_method'],
                'amount_tendered'  => $data['amount_tendered'] ?? null,
                'change_due'       => $data['change_due'] ?? null,
                'status'           => 'Completed',
            ]);

            foreach ($data['items'] as $item) {
                $subtotal = $item['quantity'] * $item['unit_price'];

                $saleItem = SalesItem::create([
                    'transaction_id' => $transaction->transaction_id,
                    'product_id'     => $item['product_id'],
                    'quantity'       => $item['quantity'],
                    'unit_price'     => $item['unit_price'],
                    'subtotal'       => $subtotal,
                ]);

                // Deduct inventory
                $inventory = Inventory::where('product_id', $item['product_id'])->first();
                if ($inventory) {
                    $inventory->current_stock = max(0, $inventory->current_stock - $item['quantity']);
                    $inventory->stock_status  = $inventory->current_stock <= 0 ? 'Low Stock' : 'Normal';
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

            return response()->json([
                'message'        => 'Transaction completed.',
                'transaction_id' => $transaction->transaction_id,
                'total_amount'   => $total,
            ], 201);
        });
    }
}
