<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnomalyDetected
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly string $type,
        public readonly string $description,
        public readonly string $severity = 'warning',
        public readonly array $data = [],
    ) {
    }
}
