<?php

namespace App\Services\Ml;

use App\Models\ForecastResult;
use App\Models\Product;
use App\Models\SalesItem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ForecastService
{
    public const OVERVIEW_CACHE_KEY = 'forecast.overview.30';

    public function __construct(private MlServiceClient $ml)
    {
    }

    /**
     * Generate a 30-day forecast for every active product.
     *
     * @throws MlServiceUnavailableException when the Python service cannot be reached.
     */
    public function generateForAll(): int
    {
        $generated = 0;

        foreach (Product::where('status', 'Active')->with('inventory')->get() as $product) {
            if ($this->generateForProduct($product)) {
                $generated++;
            }
        }

        Cache::forget(self::OVERVIEW_CACHE_KEY);

        return $generated;
    }

    public function generateForProduct(Product $product): bool
    {
        $sales = $this->dailySalesSeries($product);

        $result = $this->ml->forecast([
            'product_id' => $product->product_id,
            'horizon_days' => 30,
            'sales' => $sales
                ->map(fn ($row) => ['period' => $row->period, 'quantity' => (float) $row->quantity])
                ->values()
                ->all(),
            'current_stock' => (float) ($product->inventory?->current_stock ?? 0),
            'reorder_level' => (float) ($product->reorder_level ?? 0),
        ]);

        $series = $result['series'] ?? [];

        if ($series === []) {
            return false;
        }

        $generatedAt = now();

        ForecastResult::where('product_id', $product->product_id)->delete();

        foreach ($series as $point) {
            ForecastResult::create([
                'product_id' => $product->product_id,
                'forecast_period' => (string) $point['period'],
                'predicted_demand' => (int) round((float) ($point['predicted_demand'] ?? 0)),
                'lower_bound' => $point['lower'] ?? null,
                'upper_bound' => $point['upper'] ?? null,
                'confidence' => $point['confidence'] ?? null,
                'overstock_risk' => $result['overstock_risk'] ?? 'Low',
                'generated_date' => $generatedAt,
            ]);
        }

        return true;
    }

    /**
     * Daily completed-sales quantities per product for the last 120 days.
     *
     * @return \Illuminate\Support\Collection<int, object>
     */
    private function dailySalesSeries(Product $product)
    {
        return DB::table('Sales_Item')
            ->join('Sales_Transaction', 'Sales_Transaction.transaction_id', '=', 'Sales_Item.transaction_id')
            ->where('Sales_Item.product_id', $product->product_id)
            ->where('Sales_Transaction.status', 'Completed')
            ->whereBetween('Sales_Transaction.transaction_date', [now()->subDays(120), now()])
            ->selectRaw('DATE(Sales_Transaction.transaction_date) as period, SUM(Sales_Item.quantity) as quantity')
            ->groupBy('period')
            ->orderBy('period')
            ->get();
    }
}
