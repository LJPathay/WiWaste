<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RejectRecommendationRequest;
use App\Http\Resources\InventoryRecommendationResource;
use App\Models\AuditLog;
use App\Models\InventoryRecommendation;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryRecommendation::with('product.category', 'reviewer');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        return response()->json(
            $query->orderByDesc('recommendation_id')->paginate($perPage)->through(fn ($r) => (new InventoryRecommendationResource($r))->resolve($request))
        );
    }

    public function show($id)
    {
        $r = InventoryRecommendation::with('product.category', 'reviewer')->findOrFail($id);

        return (new InventoryRecommendationResource($r))->resolve(request());
    }

    public function approve($id, Request $request)
    {
        $recommendation = InventoryRecommendation::with('product')->findOrFail($id);

        $recommendation->status = 'approved';
        $recommendation->reviewed_by = $request->user()?->User_id ?? 1;
        $recommendation->reviewed_at = now();
        $recommendation->save();

        AuditLog::create([
            'user_id' => $recommendation->reviewed_by,
            'action' => "Approved recommendation: {$recommendation->recommendation_type} for {$recommendation->product?->product_name}",
            'entity_type' => 'Inventory_Recommendation',
            'entity_id' => $recommendation->recommendation_id,
            'old_values' => json_encode(['status' => 'pending']),
            'new_values' => json_encode(['status' => 'approved']),
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Recommendation approved.']);
    }

    public function reject($id, RejectRecommendationRequest $request)
    {
        $data = $request->validated();

        $recommendation = InventoryRecommendation::with('product')->findOrFail($id);

        $recommendation->status = 'rejected';
        $recommendation->reviewed_by = $request->user()?->User_id ?? 1;
        $recommendation->rejection_reason = $data['rejection_reason'];
        $recommendation->reviewed_at = now();
        $recommendation->save();

        AuditLog::create([
            'user_id' => $recommendation->reviewed_by,
            'action' => "Rejected recommendation: {$recommendation->recommendation_type} for {$recommendation->product?->product_name} â€” {$data['rejection_reason']}",
            'entity_type' => 'Inventory_Recommendation',
            'entity_id' => $recommendation->recommendation_id,
            'old_values' => json_encode(['status' => 'pending']),
            'new_values' => json_encode(['status' => 'rejected', 'rejection_reason' => $data['rejection_reason']]),
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Recommendation rejected.']);
    }
}
