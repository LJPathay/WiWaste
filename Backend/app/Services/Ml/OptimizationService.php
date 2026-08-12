<?php

namespace App\Services\Ml;

use App\Models\ForecastResult;
use App\Models\Product;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OptimizationService
{
    public function __construct(private MlServiceClient $ml)
    {
    }

    /**
     * Build the feature rows for every candidate SKU and run the GA optimizer
     * in the Python service.
     *
     * @param  int[]|null  $includeProductIds  restrict the optimizer to these products (null = all active).
     * @return array<string, mixed> the optimizer payload (plan, total_order_value, fitness, confidence, ...).
     *
     * @throws MlServiceUnavailableException when the Python service cannot be reached.
     */
    public function optimize(float $budget, int $horizonDays = 30, ?array $includeProductIds = null, int $seed = 42): array
    {
        $products = Product::with('category', 'supplier', 'inventory')
            ->where('status', 'Active')
            ->when($includeProductIds, fn ($q) => $q->whereIn('product_id', $includeProductIds))
            ->get();

        $forecastDemand = $this->forecastDemandByProduct($horizonDays);
        $salesVelocity = $this->salesVelocity7d();

        $inputs = $products->filter(function (Product $product) use ($forecastDemand, $salesVelocity) {
            $demand = $this->demandFor($product, $forecastDemand, $salesVelocity);

            return $demand > 0 || $product->inventory?->stock_status === 'Low Stock';
        })->map(function (Product $product) use ($forecastDemand, $salesVelocity, $horizonDays) {
            return [
                'product_id'        => $product->product_id,
                'product_name'      => $product->product_name,
                'current_stock'     => (float) ($product->inventory?->current_stock ?? 0),
                'forecast_demand'   => $this->demandFor($product, $forecastDemand, $salesVelocity, $horizonDays),
                'unit_cost'         => (float) ($product->cost_price ?? 0),
                'selling_price'     => (float) ($product->selling_price ?? 0),
                'expiring_fraction' => $this->expiringFraction($product->expiration_date),
            ];
        })->values()->all();

        return $this->ml->optimizeReplenishment([
            'budget'   => $budget,
            'products' => $inputs,
            'seed'     => $seed,
        ]);
    }

    /**
     * Forecast demand per product for the given horizon (sum of the latest
     * ARIMA run), keyed by product_id.
     *
     * @return Collection<int, float>
     */
    private function forecastDemandByProduct(int $horizonDays): Collection
    {
        $latest = ForecastResult::max('generated_date');

        if ($latest === null) {
            return collect();
        }

        return ForecastResult::where('generated_date', $latest)
            ->whereBetween('forecast_period', [now()->toDateString(), now()->addDays($horizonDays)->toDateString()])
            ->get()
            ->groupBy('product_id')
            ->map(fn ($rows) => (float) $rows->sum('predicted_demand'));
    }

    /**
     * Completed-sales quantity per product over the last 7 days.
     *
     * @return Collection<int, object>
     */
    private function salesVelocity7d(): Collection
    {
        return DB::table('Sales_Item')
            ->join('Sales_Transaction', 'Sales_Transaction.transaction_id', '=', 'Sales_Item.transaction_id')
            ->where('Sales_Transaction.status', 'Completed')
            ->whereBetween('Sales_Transaction.transaction_date', [now()->subDays(7), now()])
            ->select('Sales_Item.product_id', DB::raw('SUM(Sales_Item.quantity) AS total'))
            ->groupBy('Sales_Item.product_id')
            ->get()
            ->keyBy('product_id');
    }

    private function demandFor(Product $product, Collection $forecastDemand, Collection $salesVelocity, int $horizonDays = 30): float
    {
        $fromForecast = (float) ($forecastDemand->get($product->product_id) ?? 0);

        if ($fromForecast > 0) {
            return round($fromForecast, 2);
        }

        $velocity = (float) ($salesVelocity->get($product->product_id)?->total ?? 0) / 7;

        return round($velocity * $horizonDays, 2);
    }

    private function expiringFraction(?string $expirationDate): float
    {
        if ($expirationDate === null) {
            return 0.0;
        }

        $days = (float) now()->diffInDays(Carbon::parse($expirationDate));

        if ($days <= 7) {
            return 0.9;
        }
        if ($days <= 30) {
            return 0.6;
        }
        if ($days <= 90) {
            return 0.3;
        }

        return 0.05;
    }
}
