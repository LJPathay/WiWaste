<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForecastResult;
use App\Models\Product;
use App\Services\Ml\ForecastService;
use App\Services\Ml\MlServiceUnavailableException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ForecastController extends Controller
{
    public function __construct(private ForecastService $forecast)
    {
    }

    public function overview(Request $request)
    {
        $horizonDays = max(1, min(365, (int) $request->query('horizon_days', 30)));
        $cacheKey = "forecast.overview.{$horizonDays}";

        return Cache::remember($cacheKey, 3600, function () use ($horizonDays) {
            $rows = ForecastResult::query()
                ->select('forecast_period', 'predicted_demand', 'overstock_risk', 'confidence', 'generated_date')
                ->orderBy('forecast_period')
                ->get();

            $series = $rows
                ->groupBy('forecast_period')
                ->map(fn ($group) => [
                    'period' => (string) $group->first()->forecast_period,
                    'predicted_demand' => round((float) $group->sum('predicted_demand'), 2),
                ])
                ->values();

            $topRisks = ForecastResult::query()
                ->select('product_id', 'overstock_risk', 'predicted_demand')
                ->with('product')
                ->where('overstock_risk', 'High')
                ->orderByDesc('predicted_demand')
                ->get()
                ->unique('product_id')
                ->take(5)
                ->map(fn ($r) => [
                    'product_id' => (int) $r->product_id,
                    'product_name' => $r->product?->product_name ?? "Product #{$r->product_id}",
                    'overstock_risk' => $r->overstock_risk,
                    'predicted_demand' => round((float) $r->predicted_demand, 2),
                ])
                ->values();

            $avgConfidence = $rows->avg('confidence');

            return [
                'generated_at' => $rows->max('generated_date'),
                'total_products' => (int) ForecastResult::query()->distinct('product_id')->count('product_id'),
                'avg_confidence' => round((float) ($avgConfidence ?? 0), 1),
                'model' => 'ARIMA/SARIMAX',
                'horizon_days' => $horizonDays,
                'top_risks' => $topRisks,
                'series' => $series,
            ];
        });
    }

    public function show($product_id)
    {
        $product = Product::with('inventory')->findOrFail($product_id);

        $rows = ForecastResult::where('product_id', $product->product_id)
            ->orderBy('forecast_period')
            ->get();

        return response()->json([
            'product_id' => (int) $product->product_id,
            'product_name' => $product->product_name,
            'sku' => $product->barcode,
            'current_stock' => (float) ($product->inventory?->current_stock ?? 0),
            'reorder_level' => (float) ($product->reorder_level ?? 0),
            'overstock_risk' => $rows->last()?->overstock_risk ?? 'Low',
            'model' => 'ARIMA/SARIMAX',
            'horizon_days' => $rows->count(),
            'series' => $rows->map(fn ($r) => [
                'period' => (string) $r->forecast_period,
                'predicted_demand' => (float) $r->predicted_demand,
                'lower' => (float) ($r->lower_bound ?? 0),
                'upper' => (float) ($r->upper_bound ?? 0),
                'confidence' => (float) ($r->confidence ?? 0),
            ])->values(),
        ]);
    }

    public function generate(Request $request)
    {
        try {
            $count = $this->forecast->generateForAll();
        } catch (MlServiceUnavailableException $e) {
            return response()->json([
                'message' => 'ML forecast service is unavailable. Start the Python service: uvicorn app.main:app --port 8001',
            ], 503);
        }

        return response()->json([
            'generated' => $count,
            'timestamp' => now()->toDateTimeString(),
        ]);
    }
}
