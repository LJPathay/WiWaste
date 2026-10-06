<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WastageFlagResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->flag_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->product_name,
            'sku' => $this->product?->barcode,
            'batch_id' => $this->batch_id,
            'batch_number' => $this->batch?->batch_number,
            'flagged_by' => $this->flaggedBy?->Full_name ?? 'System',
            'quantity' => $this->quantity,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'reviewed_by' => $this->reviewedBy?->Full_name,
            'reviewed_at' => $this->reviewed_at,
            'rejection_reason' => $this->rejection_reason,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
        ];
    }
}
