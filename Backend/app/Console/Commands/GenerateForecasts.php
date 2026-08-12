<?php

namespace App\Console\Commands;

use App\Services\Ml\ForecastService;
use App\Services\Ml\MlServiceUnavailableException;
use Illuminate\Console\Command;

class GenerateForecasts extends Command
{
    protected $signature = 'forecast:generate';

    protected $description = 'Generate 30-day ARIMA forecasts for all active products via the ML service';

    public function handle(ForecastService $forecast): int
    {
        try {
            $count = $forecast->generateForAll();
        } catch (MlServiceUnavailableException $e) {
            $this->error('ML service unavailable: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info("Generated forecasts for {$count} product(s).");

        return self::SUCCESS;
    }
}
