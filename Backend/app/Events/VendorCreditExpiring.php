<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VendorCreditExpiring
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly string $vendorName,
        public readonly float $creditAmount,
        public readonly string $deadline,
        public readonly int $daysRemaining,
    ) {
    }
}
