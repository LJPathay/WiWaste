<?php

namespace App\Jobs;

use App\Http\Controllers\Api\PayMongoController;
use App\Models\SalesTransaction;
use App\Services\PayMongoService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class ProcessPayMongoWebhook implements ShouldQueue
{
    use Dispatchable, Queueable;

    private int $transactionId;
    private string $eventType;
    private string $paymentIntentId;

    public function __construct(int $transactionId, string $eventType, string $paymentIntentId)
    {
        $this->transactionId = $transactionId;
        $this->eventType = $eventType;
        $this->paymentIntentId = $paymentIntentId;
    }

    public function handle(PayMongoService $paymongoService): void
    {
        $transaction = SalesTransaction::find($this->transactionId);
        if (!$transaction || $transaction->payment_method !== 'PayMongo' || $transaction->status === 'Completed') {
            return;
        }

        if (empty($transaction->paymongo_intent_id) && $this->paymentIntentId) {
            $transaction->paymongo_intent_id = $this->paymentIntentId;
            $transaction->save();
        }

        app(PayMongoController::class)->finalize($this->transactionId, $paymongoService);
    }
}
