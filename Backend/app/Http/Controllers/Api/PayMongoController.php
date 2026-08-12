<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessPayMongoWebhook;
use App\Jobs\WarmAnalyticsCache;
use App\Models\SalesTransaction;
use App\Models\Inventory;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Services\PayMongoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayMongoController extends Controller
{
    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Paymongo-Signature');

        if (!app(PayMongoService::class)->verifyWebhookSignature($payload, $signature)) {
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $body = json_decode($payload, true);
        $eventType = data_get($body, 'data.attributes.type') ?? $body['type'] ?? null;
        $intentId = data_get($body, 'data.attributes.data.attributes.payment_intent.id')
            ?? data_get($body, 'data.attributes.payment_intent.id')
            ?? data_get($body, 'data.id')
            ?? null;
        $transactionId = data_get($body, 'data.attributes.data.attributes.metadata.transaction_id')
            ?? data_get($body, 'data.attributes.metadata.transaction_id')
            ?? null;

        if (!$eventType || !$intentId || !$transactionId) {
            return response()->json(['message' => 'Invalid webhook payload.'], 400);
        }

        if (in_array($eventType, ['payment.paid', 'payment.failed'], true)) {
            ProcessPayMongoWebhook::dispatch((int) $transactionId, $eventType, $intentId);
        }

        return response()->json(['received' => true]);
    }

    public function status(int $transaction_id, PayMongoService $paymongoService)
    {
        $transaction = SalesTransaction::find($transaction_id);
        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found.'], 404);
        }

        return response()->json($this->finalize($transaction_id, $paymongoService));
    }

    /**
     * Idempotently finalize a PayMongo sale once its PaymentIntent is confirmed as paid.
     * Safe to call repeatedly (webhook + poll) — it is a no-op once the sale is Completed.
     */
    public function finalize(int $transactionId, PayMongoService $paymongoService): array
    {
        $transaction = SalesTransaction::find($transactionId);
        if (!$transaction || $transaction->payment_method !== 'PayMongo') {
            return $this->payload($transaction);
        }

        if ($transaction->status === 'Completed' || empty($transaction->paymongo_intent_id)) {
            return $this->payload($transaction);
        }

        $intent = $paymongoService->retrieveIntent($transaction->paymongo_intent_id);
        $intentStatus = data_get($intent, 'data.attributes.status');

        if ($intentStatus !== 'paid') {
            if (in_array($intentStatus, ['failed', 'cancelled'], true)) {
                $transaction->payment_status = 'failed';
                $transaction->save();
            }
            return $this->payload($transaction);
        }

        DB::transaction(function () use ($transaction, $intent) {
            $locked = SalesTransaction::whereKey($transaction->transaction_id)->lockForUpdate()->first();
            if (!$locked || $locked->status === 'Completed') {
                return;
            }

            $locked->status = 'Completed';
            $locked->payment_status = 'paid';
            $locked->payment_reference = data_get($intent, 'data.attributes.payment_method_type');
            $locked->save();

            foreach ($locked->salesItems as $item) {
                $inventory = Inventory::where('product_id', $item->product_id)
                    ->with('product')
                    ->lockForUpdate()
                    ->first();
                if ($inventory) {
                    $inventory->current_stock -= $item->quantity;
                    $inventory->stock_status = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                    $inventory->last_updated = now();
                    $inventory->save();
                }

                StockMovement::create([
                    'product_id'    => $item->product_id,
                    'user_id'       => $locked->user_id,
                    'movement_type' => 'Stock Out',
                    'quantity'      => $item->quantity,
                    'remarks'       => 'PayMongo sale - Txn #' . $locked->transaction_id,
                    'movement_date' => now(),
                    'sale_item_id'  => $item->sales_item_id,
                ]);
            }

            AuditLog::create([
                'user_id'       => $locked->user_id,
                'action'        => "Finalize PayMongo sale #{$locked->transaction_id}",
                'entity_type'   => 'Sales',
                'entity_id'     => $locked->transaction_id,
                'old_values'    => null,
                'new_values'    => json_encode(['status' => 'Completed', 'payment_status' => 'paid']),
                'created_at'    => now(),
            ]);

            WarmAnalyticsCache::dispatch();
        });

        return $this->payload($transaction->fresh());
    }

    private function payload(?SalesTransaction $transaction): array
    {
        if (!$transaction) {
            return [
                'transaction_id'    => null,
                'payment_status'    => null,
                'status'            => null,
                'payment_reference' => null,
            ];
        }

        return [
            'transaction_id'    => $transaction->transaction_id,
            'payment_status'    => $transaction->payment_status,
            'status'            => $transaction->status,
            'payment_reference' => $transaction->payment_reference,
        ];
    }
}
