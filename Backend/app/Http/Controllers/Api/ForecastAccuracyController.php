<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ForecastAccuracy;

class ForecastAccuracyController extends Controller
{
    /**
     * Get accuracy metrics for a product.
     * GET /api/ml/accuracy/{product_id}
     */
    public function show(int $product_id)
    {
        $records = ForecastAccuracy::where('product_id', $product_id)
            ->orderByDesc('forecast_date')
            ->limit(30)
            ->get();

        $mape7 = ForecastAccuracy::rollingMape($product_id, 7);
        $mape30 = ForecastAccuracy::rollingMape($product_id, 30);

        return response()->json([
            'product_id' => $product_id,
            'mape_7day' => $mape7,
            'mape_30day' => $mape30,
            'records' => $records,
        ]);
    }

    /**
     * Get all products with high MAPE (>30%).
     * GET /api/ml/accuracy/alerts
     */
    public function alerts()
    {
        $highMapeProducts = [];

        $products = \App\Models\Inventory::all();
        foreach ($products as $product) {
            $mape = ForecastAccuracy::rollingMape($product->product_id, 7);
            if ($mape && $mape > 30) {
                $highMapeProducts[] = [
                    'product_id' => $product->product_id,
                    'product_name' => $product->product_name,
                    'mape_7day' => $mape,
                ];
            }
        }

        return response()->json([
            'alerts' => $highMapeProducts,
            'count' => count($highMapeProducts),
        ]);
    }

    /**
     * Store a new forecast accuracy record.
     * POST /api/ml/accuracy
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|integer',
            'forecast_date' => 'required|date',
            'predicted_value' => 'required|numeric|min:0',
            'actual_value' => 'nullable|numeric|min:0',
            'model_version' => 'nullable|string|max:50',
        ]);

        $mape = null;
        if ($validated['actual_value'] !== null && $validated['predicted_value'] > 0) {
            $mape = abs($validated['predicted_value'] - $validated['actual_value']) / $validated['predicted_value'] * 100;
        }

        $record = ForecastAccuracy::create([
            ...$validated,
            'mape' => $mape,
            'recorded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Accuracy record stored',
            'id' => $record->id,
            'mape' => $mape,
        ], 201);
    }
}
