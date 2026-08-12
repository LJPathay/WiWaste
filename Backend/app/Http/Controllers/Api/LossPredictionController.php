<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Ml\LossPredictionService;
use App\Services\Ml\MlServiceUnavailableException;
use Illuminate\Http\Request;

class LossPredictionController extends Controller
{
    public function __construct(private LossPredictionService $lossPrediction)
    {
    }

    /**
     * Score all active products against the XGBoost model (live call) and
     * return the risk list together with a summary.
     */
    public function predict()
    {
        try {
            $results = $this->lossPrediction->scoreAll();
        } catch (MlServiceUnavailableException $e) {
            return response()->json([
                'message' => 'ML loss-risk service is unavailable. Start the Python service: uvicorn app.main:app --port 8001',
            ], 503);
        }

        $payload = $this->lossPrediction->cached();

        return response()->json([
            'generated_at' => $payload['generated_at']?->toIso8601String(),
            'engine'       => $payload['engine'],
            'summary'      => $this->buildSummary($results),
            'results'      => $results,
        ]);
    }

    /**
     * Read the last cached scoring run. Optional ?tier=High|Medium|Low filter
     * and ?sort=expected_loss|probability (descending).
     */
    public function items(Request $request)
    {
        $payload = $this->lossPrediction->cached();
        $results = collect($payload['results']);

        if (in_array($tier = $request->query('tier'), ['High', 'Medium', 'Low'], true)) {
            $results = $results->where('risk_tier', $tier);
        }

        $results = (match ($request->query('sort')) {
            'probability' => $results->sortByDesc('loss_probability'),
            default       => $results->sortByDesc('expected_loss'),
        })->values();

        return response()->json([
            'generated_at' => $payload['generated_at']?->toIso8601String(),
            'engine'       => $payload['engine'],
            'total'        => $results->count(),
            'items'        => $results,
        ]);
    }

    public function summary()
    {
        $payload = $this->lossPrediction->cached();

        return response()->json([
            'generated_at' => $payload['generated_at']?->toIso8601String(),
            'engine'       => $payload['engine'],
            'summary'      => $this->buildSummary($payload['results']),
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $results
     * @return array<string, mixed>
     */
    private function buildSummary(array $results): array
    {
        $results = collect($results);

        return [
            'total_products'      => $results->count(),
            'high_risk'           => $results->where('risk_tier', 'High')->count(),
            'medium_risk'         => $results->where('risk_tier', 'Medium')->count(),
            'low_risk'            => $results->where('risk_tier', 'Low')->count(),
            'total_expected_loss' => round((float) $results->sum('expected_loss'), 2),
        ];
    }
}
