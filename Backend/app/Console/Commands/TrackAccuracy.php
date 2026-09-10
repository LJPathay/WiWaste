<?php

namespace App\Console\Commands;

use App\Models\ForecastAccuracy;
use App\Models\Inventory;
use Illuminate\Console\Command;

class TrackAccuracy extends Command
{
    protected $signature = 'ml:accuracy:track';

    protected $description = 'Check prediction accuracy vs actuals and update MAPE tracking';

    public function handle(): int
    {
        try {
            $products = Inventory::all();

            if ($products->isEmpty()) {
                $this->info('No products to track.');
                return self::SUCCESS;
            }

            $tracked = 0;

            foreach ($products as $product) {
                // Get yesterday's forecast for this product
                $yesterdayForecast = ForecastAccuracy::where('product_id', $product->product_id)
                    ->whereDate('forecast_date', now()->subDay())
                    ->first();

                if (!$yesterdayForecast) {
                    continue;
                }

                // In a real system, you'd query actual sales data here
                // For now, we'll simulate actual values
                $actualValue = $product->current_stock; // Placeholder

                if ($yesterdayForecast->predicted_value > 0) {
                    $mape = abs($yesterdayForecast->predicted_value - $actualValue) / $yesterdayForecast->predicted_value * 100;

                    // Update the existing record with actual value and MAPE
                    $yesterdayForecast->update([
                        'actual_value' => $actualValue,
                        'mape' => $mape,
                    ]);

                    // Check if MAPE > 30% for 7 days → alert
                    $rollingMape = ForecastAccuracy::rollingMape($product->product_id, 7);
                    if ($rollingMape && $rollingMape > 30) {
                        $this->warn("  High MAPE ({$rollingMape}%) for product {$product->product_id} — consider retraining");
                    }

                    $tracked++;
                }
            }

            $this->info("Tracked accuracy for {$tracked} product(s).");
            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Accuracy tracking failed: {$e->getMessage()}");
            return self::FAILURE;
        }
    }
}
