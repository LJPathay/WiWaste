<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WebhookRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class WebhookController extends Controller
{
    /**
     * Handle incoming webhook from external services
     * 
     * Supported events:
     * - payment.completed
     * - payment.failed
     * - delivery.status_updated
     * - inventory.low_stock
     * - product.expired
     * - supplier.license_expiring
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function handle(Request $request)
    {
        // Verify webhook signature
        if (!$this->verifySignature($request)) {
            Log::warning('Webhook signature verification failed', [
                'ip' => $request->ip(),
                'headers' => $request->headers->all(),
            ]);
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $event = $request->header('X-Webhook-Event');
        $payload = $request->json()->all();

        Log::info('Webhook received', [
            'event' => $event,
            'payload' => $payload,
        ]);

        try {
            $this->handleEvent($event, $payload);
            
            return response()->json(['status' => 'processed']);
        } catch (\Exception $e) {
            Log::error('Webhook processing failed', [
                'event' => $event,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json(['message' => 'Processing failed'], 500);
        }
    }

    /**
     * Route event to appropriate handler
     */
    protected function handleEvent(string $event, array $payload): void
    {
        $handler = 'handle' . Str::studly($event);
        
        if (method_exists($this, $handler)) {
            $this->$handler($payload);
        } else {
            Log::warning('Unhandled webhook event', ['event' => $event]);
        }
    }

    /**
     * Verify webhook signature
     */
    protected function verifySignature(Request $request): bool
    {
        $signature = $request->header('X-Webhook-Signature');
        $secret = config('services.webhook.secret');
        
        if (!$secret || !$signature) {
            return false;
        }

        $payload = $request->getContent();
        $expectedSignature = hash_hmac('sha256', $payload, $secret);
        
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Handle payment completed webhook
     */
    protected function handlePaymentCompleted(array $payload): void
    {
        // Update sales transaction payment status
        // Trigger receipt generation
        // Update inventory
    }

    /**
     * Handle payment failed webhook
     */
    protected function handlePaymentFailed(array $payload): void
    {
        // Mark transaction as failed
        // Notify cashier
        // Restore inventory
    }

    /**
     * Handle delivery status updated webhook
     */
    protected function handleDeliveryStatusUpdated(array $payload): void
    {
        // Update delivery status in system
        // Notify relevant parties
    }

    /**
     * Handle low stock alert webhook
     */
    protected function handleInventoryLowStock(array $payload): void
    {
        // Create low stock alert
        // Notify inventory manager
        // Auto-generate reorder suggestion
    }

    /**
     * Handle product expired webhook
     */
    protected function handleProductExpired(array $payload): void
    {
        // Mark product as expired
        // Create wastage record
        // Notify relevant parties
    }

    /**
     * Handle supplier license expiring webhook
     */
    protected function handleSupplierLicenseExpiring(array $payload): void
    {
        // Create alert for admin
        // Update supplier compliance status
    }
}