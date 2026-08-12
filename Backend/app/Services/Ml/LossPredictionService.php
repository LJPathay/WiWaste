<?php

namespace App\Services\Ml;

use App\Models\Product;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class LossPredictionService
{
    public const CACHE_KEY = 'loss.risk.scores';

    public const CACHE_TTL = 3600;

    public function __construct(private MlServiceClient $ml)
    {
    }

    /**
     * Score every active product against the XGBoost loss-risk model and cache
     * the enriched results for one hour.
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws MlServiceUnavailableException when the Python service cannot be reached.
     */
    public function scoreAll(): array
    {
        $products = Product::with('category', 'supplier', 'inventory')
            ->where('status', 'Active')
            ->get();

        $salesVelocity = $this->salesVelocity7d();
        $salesTotals = $this->salesTotals();
        $wastageCounts = $this->wastageCounts90d();

        $payload = $products->map(fn (Product $product) => $this->featuresFor(
            $product,
            $salesVelocity,
            $salesTotals,
            $wastageCounts
        ))->values()->all();

        $scored = $this->ml->predictLoss(['products' => $payload])['results'] ?? [];

        $byId = $products->keyBy('product_id');

        $enriched = collect($scored)->map(function (array $result) use ($byId) {
            $product = $byId->get($result['product_id']);

            return array_merge($result, [
                'product_name'  => $product?->product_name ?? "Product #{$result['product_id']}",
                'sku'           => $product?->barcode ?? '',
                'category'      => $product?->category?->Category_name ?? '',
                'current_stock' => (float) ($product?->inventory?->current_stock ?? 0),
                'unit_cost'     => (float) ($product?->cost_price ?? 0),
                'days_to_expiry'=> $this->daysToExpiry($product),
            ]);
        })->values()->all();

        Cache::put(self::CACHE_KEY, [
            'generated_at' => now(),
            'engine'       => 'xgboost',
            'results'      => $enriched,
        ], self::CACHE_TTL);

        return $enriched;
    }

    /**
     * @return array{generated_at: mixed, engine: string, results: array<int, array<string, mixed>>}
     */
    public function cached(): array
    {
        return Cache::get(self::CACHE_KEY, [
            'generated_at' => null,
            'engine'       => 'xgboost',
            'results'      => [],
        ]);
    }

    /**
     * @param  Collection<int, object>  $salesVelocity
     * @param  Collection<int, object>  $salesTotals
     * @param  Collection<int, object>  $wastageCounts
     * @return array<string, mixed>
     */
    private function featuresFor(
        Product $product,
        Collection $salesVelocity,
        Collection $salesTotals,
        Collection $wastageCounts
    ): array {
        $currentStock = (float) ($product->inventory?->current_stock ?? 0);
        $totalSold = (float) ($salesTotals->get($product->product_id)?->total ?? 0);

        return [
            'product_id'        => $product->product_id,
            'category'          => $product->category?->Category_name ?? '',
            'supplier'          => $product->supplier?->supplier_name ?? '',
            'days_to_expiry'    => $this->daysToExpiry($product),
            'current_stock'     => $currentStock,
            'stock_status'      => $product->inventory?->stock_status ?? 'Normal',
            'sales_velocity_7d' => round((float) ($salesVelocity->get($product->product_id)?->total ?? 0) / 7, 4),
            'wastage_count_90d' => (int) ($wastageCounts->get($product->product_id)?->total ?? 0),
            'turnover_rate'     => round($totalSold / max($currentStock, 1), 4),
            'unit_cost'         => (float) ($product->cost_price ?? 0),
        ];
    }

    /**
     * Completed-sales quantity per product over the last 7 days.
     *
     * @return Collection<int, object>
     */
    private function salesVelocity7d(): Collection
    {
        return $this->salesByWindow(7)->keyBy('product_id');
    }

    /**
     * Completed-sales quantity per product over the last 120 days.
     *
     * @return Collection<int, object>
     */
    private function salesTotals(): Collection
    {
        return $this->salesByWindow(120)->keyBy('product_id');
    }

    /**
     * @return Collection<int, object>
     */
    private function salesByWindow(int $days): Collection
    {
        return DB::table('Sales_Item')
            ->join('Sales_Transaction', 'Sales_Transaction.transaction_id', '=', 'Sales_Item.transaction_id')
            ->where('Sales_Transaction.status', 'Completed')
            ->whereBetween('Sales_Transaction.transaction_date', [now()->subDays($days), now()])
            ->select('Sales_Item.product_id', DB::raw('SUM(Sales_Item.quantity) AS total'))
            ->groupBy('Sales_Item.product_id')
            ->get();
    }

    /**
     * Wastage records per product over the last 90 days.
     *
     * @return Collection<int, object>
     */
    private function wastageCounts90d(): Collection
    {
        return DB::table('Wastage_Record')
            ->where('date_recorded', '>=', now()->subDays(90))
            ->select('product_id', DB::raw('COUNT(*) AS total'))
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');
    }

    private function daysToExpiry(?Product $product): float
    {
        if ($product === null || $product->expiration_date === null) {
            return 365;
        }

        $expiry = \Illuminate\Support\Carbon::parse($product->expiration_date);

        return max(0, (float) now()->diffInDays($expiry));
    }
}
