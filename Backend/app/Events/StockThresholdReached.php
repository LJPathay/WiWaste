<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StockThresholdReached
{
    use Dispatchable, SerializesModels;

    public $productId;
    public $productName;
    public $currentStock;
    public $thresholdType; // 'low_stock', 'overstock', 'expiring'
    public $details;

    public function __construct(int $productId, string $productName, int $currentStock, string $thresholdType, array $details = [])
    {
        $this->productId = $productId;
        $this->productName = $productName;
        $this->currentStock = $currentStock;
        $this->thresholdType = $thresholdType;
        $this->details = $details;
    }
}
