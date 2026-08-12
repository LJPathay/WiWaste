<?php

namespace App\Services\Ml;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class MlServiceClient
{
    private string $baseUrl;

    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.ml_service.url', 'http://localhost:8001'), '/');
        $this->timeout = (int) config('services.ml_service.timeout', 30);
    }

    /**
     * POST a forecast request to the Python service.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws MlServiceUnavailableException
     */
    public function forecast(array $payload): array
    {
        return $this->postJson('/forecast', $payload);
    }

    /**
     * POST a loss-risk scoring request to the Python service.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws MlServiceUnavailableException
     */
    public function predictLoss(array $payload): array
    {
        return $this->postJson('/predict/loss', $payload);
    }

    /**
     * POST a GA replenishment optimization request to the Python service.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws MlServiceUnavailableException
     */
    public function optimizeReplenishment(array $payload): array
    {
        return $this->postJson('/optimize/replenishment', $payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws MlServiceUnavailableException
     */
    private function postJson(string $path, array $payload): array
    {
        try {
            $response = Http::timeout($this->timeout)->post($this->baseUrl.$path, $payload);
        } catch (ConnectionException $e) {
            throw new MlServiceUnavailableException('ML service is offline: '.$e->getMessage());
        }

        if ($response->failed()) {
            throw new MlServiceUnavailableException('ML service returned HTTP '.$response->status());
        }

        return $response->json() ?? [];
    }

    public function isHealthy(): bool
    {
        try {
            return Http::timeout(3)->get($this->baseUrl.'/health')->successful();
        } catch (ConnectionException $e) {
            return false;
        }
    }
}
