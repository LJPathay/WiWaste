<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockCountResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->count_id,
            'product_id'     => $this->product_id,
            'product_name'   => $this->product?->product_name,
            'sku'            => $this->product?->barcode,
            'batch_id'       => $this->batch_id,
            'batch_number'   => $this->batch?->batch_number,
            'counted_by'     => $this->counter?->Full_name ?? 'System',
            'system_qty'     => $this->system_qty,
            'counted_qty'    => $this->counted_qty,
            'variance'       => $this->variance,
            'notes'          => $this->notes,
            'status'         => $this->status,
            'created_at'     => $this->created_at,
            'approved_by'    => $this->approver?->Full_name,
            'approved_at'    => $this->approved_at,
            'rejection_reason' => $this->rejection_reason,
            'business_id'    => $this->business_id,
            'branch_id'      => $this->branch_id,
        ];
    }
}
