<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnomalyDetected
{
    use Dispatchable, SerializesModels;

    public $type;
    public $description;
    public $severity;
    public $data;

    public function __construct(string $type, string $description, string $severity = 'warning', array $data = [])
    {
        $this->type = $type;
        $this->description = $description;
        $this->severity = $severity;
        $this->data = $data;
    }
}
