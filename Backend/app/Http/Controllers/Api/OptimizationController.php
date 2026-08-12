<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryRecommendation;
use App\Services\Ml\MlServiceUnavailableException;
use App\Services\Ml\OptimizationService;
use Illuminate\Http\Request;

class OptimizationController extends Controller
{
    public function __construct(private OptimizationService $optimization)
    {
    }

    /**
     * Run the GA replenishment optimizer and persist pending 'Reorder'
     * recommendations for every SKU the plan says to order.
     */
    public function replenishment(Request $request)
    {
        $data = $request->validate([
            'budget'              => 'required|numeric|gt:0',
            'horizon_days'        => 'sometimes|integer|min:1|max:365',
            'include_product_ids' => 'sometimes|array',
            'include_product_ids.*' => 'integer',
            'persist'             => 'sometimes|boolean',
            'seed'                => 'sometimes|integer',
        ]);

        try {
            $result = $this->optimization->optimize(
                (float) $data['budget'],
                (int) ($data['horizon_days'] ?? 30),
                $data['include_product_ids'] ?? null,
                (int) ($data['seed'] ?? 42),
            );
        } catch (MlServiceUnavailableException $e) {
            return response()->json([
                'message' => 'ML optimization service is unavailable. Start the Python service: uvicorn app.main:app --port 8001',
            ], 503);
        }

        $persist = filter_var($data['persist'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $recommendationsWritten = 0;

        if ($persist && isset($result['plan'])) {
            $recommendationsWritten = $this->persistRecommendations($result['plan'], (float) ($result['confidence'] ?? 0));
        }

        return response()->json(array_merge($result, [
            'generated_at'           => now()->toDateTimeString(),
            'recommendations_written' => $recommendationsWritten,
        ]));
    }

    /**
     * Upsert pending 'Reorder' recommendations so the plan flows through the
     * existing approve/reject workflow in /recommendations.
     *
     * @param  array<int, array<string, mixed>>  $plan
     */
    private function persistRecommendations(array $plan, float $confidence): int
    {
        $toOrder = collect($plan)->filter(fn ($item) => (int) $item['order_qty'] > 0);

        if ($toOrder->isEmpty()) {
            return 0;
        }

        $productIds = $toOrder->pluck('product_id')->all();

        InventoryRecommendation::whereIn('product_id', $productIds)
            ->where('recommendation_type', 'Reorder')
            ->where('status', 'pending')
            ->delete();

        foreach ($toOrder as $item) {
            InventoryRecommendation::create([
                'product_id'         => $item['product_id'],
                'current_stock'      => (int) round((float) $item['current_stock']),
                'recommended_stock'  => (int) round((float) $item['current_stock'] + (float) $item['order_qty']),
                'recommendation_type'=> 'Reorder',
                'confidence_score'   => round($confidence, 2),
                'status'             => 'pending',
                'created_at'         => now(),
            ]);
        }

        return $toOrder->count();
    }
}
