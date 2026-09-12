<?php

namespace App\Console\Commands;

use App\Services\Ml\MlServiceClient;
use App\Services\Ml\MlServiceUnavailableException;
use App\Models\Inventory;
use App\Models\FEFOLog;
use Illuminate\Console\Command;

class ScoreLossRisk extends Command
{
    protected $signature = 'loss-risk:score';

    protected $description = 'Score loss-risk for all active products via XGBoost and auto-flag high-risk FEFO batches';

    public function handle(MlServiceClient $ml): int
    {
        try {
            $products = Inventory::all();

            if ($products->isEmpty()) {
                $this->info('No products to score.');
                return self::SUCCESS;
            }

            $scored = 0;
            $flagged = 0;

            foreach ($products as $product) {
                try {
                    $result = $ml->predictLossRisk([
                        'product_id' => $product->product_id,
                        'current_stock' => $product->current_stock,
                        'selling_price' => $product->selling_price,
                        'cost_price' => $product->cost_price,
                    ]);

                    $lossProbability = $result['loss_probability'] ?? 0;
                    $expectedLoss = $result['expected_loss'] ?? 0;
                    $scored++;

                    // Auto-flag FEFO batches if loss probability >= 0.8 and days to expiry <= 7
                    if ($lossProbability >= 0.8) {
                        $expiringBatches = FEFOLog::where('product_id', $product->product_id)
                            ->whereRaw('DATEDIFF(expiry_date, NOW()) <= 7')
                            ->whereRaw('DATEDIFF(expiry_date, NOW()) >= 0')
                            ->get();

                        foreach ($expiringBatches as $batch) {
                            $batch->update(['status' => 'flagged']);
                            $flagged++;
                        }

                        $this->line("  Flagged {$expiringBatches->count()} batch(es) for product {$product->product_id}");
                    }

                    // Create wastage draft if expected loss > 5000 and stock is not low
                    if ($expectedLoss > 5000 && $product->stock_status !== 'Low Stock') {
                        \App\Models\WastageRecord::create([
                            'product_id' => $product->product_id,
                            'quantity' => 1,
                            'reason' => 'Auto-flagged: high expected loss (₱' . number_format($expectedLoss, 2) . ')',
                            'unit_cost' => $product->cost_price,
                            'recorded_by' => 'System (ML)',
                        ]);
                        $this->line("  Created wastage draft for product {$product->product_id}");
                    }
                } catch (MlServiceUnavailableException $e) {
                    $this->warn("  ML service unavailable for product {$product->product_id}: {$e->getMessage()}");
                }
            }

            $this->info("Scored {$scored} product(s), flagged {$flagged} batch(es).");
            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Loss-risk scoring failed: {$e->getMessage()}");
            return self::FAILURE;
        }
    }
}
