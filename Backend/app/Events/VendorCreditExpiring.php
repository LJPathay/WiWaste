<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VendorCreditExpiring
{
    use Dispatchable, SerializesModels;

    public $vendorName;
    public $creditAmount;
    public $deadline;
    public $daysRemaining;

    public function __construct(string $vendorName, float $creditAmount, string $deadline, int $daysRemaining)
    {
        $this->vendorName = $vendorName;
        $this->creditAmount = $creditAmount;
        $this->deadline = $deadline;
        $this->daysRemaining = $daysRemaining;
    }
}
