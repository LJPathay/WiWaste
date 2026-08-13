<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PayMongoService
{
    private function client(): PendingRequest
    {
        $client = Http::withBasicAuth(config('services.paymongo.secret_key'), '')
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(20);

        // Local dev on Windows often has no PHP CA bundle, which makes cURL fail with
        // "unable to get local issuer certificate" (error 60). Toggle via PAYMONGO_VERIFY_SSL.
        if (!config('services.paymongo.verify_ssl', true)) {
            $client = $client->withoutVerifying();
        }

        return $client;
    }

    public function createCheckoutSession(array $lineItems, string $description, string $successUrl, string $cancelUrl, ?string $paymentReference = null, ?int $transactionId = null): array
    {
        $attributes = [
            'line_items'          => array_values($lineItems),
            'payment_method_types' => ['gcash', 'paymaya', 'card'],
            'success_url'         => $successUrl,
            'cancel_url'          => $cancelUrl,
            'description'         => $description,
        ];

        if ($paymentReference) {
            $attributes['metadata'] = [
                'payment_reference' => $paymentReference,
            ];
        }

        if ($transactionId) {
            $attributes['metadata']['transaction_id'] = (string) $transactionId;
        }

        // PayMongo's v1 API expects a JSON:API envelope: { data: { attributes: { ... } } }.
        $payload = ['data' => ['attributes' => $attributes]];

        $response = $this->client()
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
        $response = $this->client()
            ->get(config('services.paymongo.base_url') . '/payment_intents/' . urlencode($intentId));

        $response->throw();

        return $response->json();
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if (empty($signature) || empty(config('services.paymongo.webhook_secret'))) {
            return false;
        }

        $secret = config('services.paymongo.webhook_secret');

        $parts = [];
        foreach (explode(',', $signature) as $pair) {
            $pair = trim($pair);
            if (str_contains($pair, '=')) {
                [$key, $value] = explode('=', $pair, 2);
                $parts[trim($key)] = $value;
            }
        }

        if (isset($parts['t'])) {
            $expected = hash_hmac('sha256', $parts['t'] . '.' . $payload, $secret);
            foreach (['te', 'li'] as $mode) {
                if (!empty($parts[$mode]) && hash_equals($expected, $parts[$mode])) {
                    return true;
                }
            }
        }

        return hash_equals(hash_hmac('sha256', $payload, $secret), $signature);
    }
}
