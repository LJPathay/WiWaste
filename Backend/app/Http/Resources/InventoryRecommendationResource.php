<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryRecommendationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'recommendation_id' => $this->recommendation_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->product_name,
            'sku' => $this->product?->barcode,
            'category' => $this->product?->category?->Category_name ?? '',
            'current_stock' => $this->current_stock,
            'recommended_stock' => $this->recommended_stock,
            'recommendation_type' => $this->recommendation_type,
            'confidence_score' => (float) $this->confidence_score,
            'status' => $this->status ?? 'pending',
            'rejection_reason' => $this->rejection_reason,
            'reviewed_by' => $this->reviewer?->Full_name ?? null,
            'created_at' => $this->created_at,
            'reviewed_at' => $this->reviewed_at,
        ];
    }
}
