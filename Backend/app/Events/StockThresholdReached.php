<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StockThresholdReached
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly int $productId,
        public readonly string $productName,
        public readonly int $currentStock,
        /** 'low_stock', 'overstock', 'expiring' */
        public readonly string $thresholdType,
        public readonly array $details = [],
    ) {
    }
}
