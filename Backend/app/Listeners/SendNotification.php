<?php

namespace App\Listeners;

use App\Events\StockThresholdReached;
use App\Events\VendorCreditExpiring;
use App\Events\AnomalyDetected;
use Illuminate\Support\Facades\DB;

class SendNotification
{
    /**
     * Handle stock threshold events.
     */
    public function handleStockThreshold(StockThresholdReached $event): void
    {
        $this->createNotification(
            "Stock Alert: {$event->productName}",
            $this->getStockMessage($event),
            $event->thresholdType === 'low_stock' ? 'warning' : 'info'
        );
    }

    /**
     * Handle vendor credit expiry events.
     */
    public function handleVendorCredit(VendorCreditExpiring $event): void
    {
        $this->createNotification(
            "Vendor Credit Expiring: {$event->vendorName}",
            "Credit of ₱{$event->creditAmount} expires in {$event->daysRemaining} days ({$event->deadline})",
            $event->daysRemaining <= 3 ? 'critical' : 'warning'
        );
    }

    /**
     * Handle anomaly detection events.
     */
    public function handleAnomaly(AnomalyDetected $event): void
    {
        $this->createNotification(
            "Anomaly Detected: {$event->type}",
            $event->description,
            $event->severity
        );
    }

    private function getStockMessage(StockThresholdReached $event): string
    {
        return match ($event->thresholdType) {
            'low_stock' => "{$event->productName} is running low ({$event->currentStock} units remaining)",
            'overstock' => "{$event->productName} is overstocked ({$event->currentStock} units)",
            'expiring' => "{$event->productName} has batches expiring soon ({$event->currentStock} units at risk)",
            default => "{$event->productName} stock alert",
        };
    }

    private function createNotification(string $title, string $message, string $type): void
    {
        try {
            DB::table('notifications')->insert([
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'read' => false,
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {
            // If notifications table doesn't exist, log instead
            \Illuminate\Support\Facades\Log::warning("Notification: {$title} - {$message}");
        }
    }
}
