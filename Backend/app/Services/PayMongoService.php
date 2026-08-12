<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PayMongoService
{
    public function createCheckoutSession(int $amountCents, string $description, string $successUrl, string $cancelUrl, ?string $paymentReference = null, ?int $transactionId = null): array
    {
        $payload = [
            'amount' => $amountCents,
            'currency' => 'PHP',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'description' => $description,
            'payment_method_types' => ['gcash', 'maya', 'card'],
        ];

        if ($paymentReference) {
            $payload['metadata'] = [
                'payment_reference' => $paymentReference,
            ];
        }

        if ($transactionId) {
            $payload['metadata']['transaction_id'] = $transactionId;
        }

        $response = Http::withBasicAuth(config('services.paymongo.secret_key'), '')
            ->acceptJson()
            ->asJson()
            ->post(config('services.paymongo.base_url') . '/checkout_sessions', $payload);

        $response->throw();

        $json = $response->json();

        return [
            'checkout_url'      => data_get($json, 'data.attributes.checkout_url'),
            'payment_intent_id' => data_get($json, 'data.attributes.payment_intent.id'),
        ];
    }

    public function retrieveIntent(string $intentId): array
    {
        $response = Http::withBasicAuth(config('services.paymongo.secret_key'), '')
            ->acceptJson()
            ->get(config('services.paymongo.base_url') . '/payment_intents/' . urlencode($intentId));

        $response->throw();

        return $response->json();
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if (empty($signature) || empty(config('services.paymongo.webhook_secret'))) {
            return false;
        }

        $expected = hash_hmac('sha256', $payload, config('services.paymongo.webhook_secret'));

        return hash_equals($expected, $signature);
    }
}
