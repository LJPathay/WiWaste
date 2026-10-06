<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WastageRecordResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->wastage_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->product_name,
            'sku' => $this->product?->barcode,
            'recorded_by' => $this->user?->Full_name ?? 'System',
            'wastage_type' => $this->wastage_type,
            'quantity' => $this->quantity,
            'estimated_loss' => $this->estimated_loss,
            'date_recorded' => $this->date_recorded,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
            'batch_id' => $this->batch_id,
        ];
    }
}
