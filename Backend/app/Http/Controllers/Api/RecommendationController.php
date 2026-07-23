<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryRecommendation;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function index(Request $request)
    {
        $query = InventoryRecommendation::with('product.category');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $limit = min((int) $request->input('per_page', 200), 1000);

        return response()->json(
            $query->orderByDesc('recommendation_id')->take($limit)->get()->map(fn ($r) => [
                'recommendation_id'  => $r->recommendation_id,
                'product_id'         => $r->product_id,
                'product_name'       => $r->product?->product_name,
                'sku'                => $r->product?->barcode,
                'category'           => $r->product?->category?->Category_name ?? '',
                'current_stock'      => $r->current_stock,
                'recommended_stock'  => $r->recommended_stock,
                'recommendation_type'=> $r->recommendation_type,
                'confidence_score'   => (float) $r->confidence_score,
                'status'             => $r->status ?? 'pending',
                'rejection_reason'   => $r->rejection_reason,
                'reviewed_by'        => $r->reviewer?->Full_name ?? null,
                'created_at'         => $r->created_at,
                'reviewed_at'        => $r->reviewed_at,
            ])
        );
    }

    public function show($id)
    {
        $r = InventoryRecommendation::with('product.category', 'reviewer')->findOrFail($id);

        return response()->json([
            'recommendation_id'  => $r->recommendation_id,
            'product_id'         => $r->product_id,
            'product_name'       => $r->product?->product_name,
            'sku'                => $r->product?->barcode,
            'category'           => $r->product?->category?->Category_name ?? '',
            'current_stock'      => $r->current_stock,
            'recommended_stock'  => $r->recommended_stock,
            'recommendation_type'=> $r->recommendation_type,
            'confidence_score'   => (float) $r->confidence_score,
            'status'             => $r->status ?? 'pending',
            'rejection_reason'   => $r->rejection_reason,
            'reviewed_by'        => $r->reviewer?->Full_name ?? null,
            'created_at'         => $r->created_at,
            'reviewed_at'        => $r->reviewed_at,
        ]);
    }

    public function approve($id, Request $request)
    {
        $recommendation = InventoryRecommendation::with('product')->findOrFail($id);

        $recommendation->status = 'approved';
        $recommendation->reviewed_by = $request->user()?->User_id ?? 1;
        $recommendation->reviewed_at = now();
        $recommendation->save();

        AuditLog::create([
            'user_id'     => $recommendation->reviewed_by,
            'action'      => "Approved recommendation: {$recommendation->recommendation_type} for {$recommendation->product?->product_name}",
            'entity_type' => 'Inventory_Recommendation',
            'entity_id'   => $recommendation->recommendation_id,
            'old_values'  => json_encode(['status' => 'pending']),
            'new_values'  => json_encode(['status' => 'approved']),
            'created_at'  => now(),
        ]);

        return response()->json(['message' => 'Recommendation approved.']);
    }

    public function reject($id, Request $request)
    {
        $data = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $recommendation = InventoryRecommendation::with('product')->findOrFail($id);

        $recommendation->status = 'rejected';
        $recommendation->reviewed_by = $request->user()?->User_id ?? 1;
        $recommendation->rejection_reason = $data['rejection_reason'];
        $recommendation->reviewed_at = now();
        $recommendation->save();

        AuditLog::create([
            'user_id'     => $recommendation->reviewed_by,
            'action'      => "Rejected recommendation: {$recommendation->recommendation_type} for {$recommendation->product?->product_name} — {$data['rejection_reason']}",
            'entity_type' => 'Inventory_Recommendation',
            'entity_id'   => $recommendation->recommendation_id,
            'old_values'  => json_encode(['status' => 'pending']),
            'new_values'  => json_encode(['status' => 'rejected', 'rejection_reason' => $data['rejection_reason']]),
            'created_at'  => now(),
        ]);

        return response()->json(['message' => 'Recommendation rejected.']);
    }
}