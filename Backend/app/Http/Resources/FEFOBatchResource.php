<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FEFOBatchResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'batch_id'      => $this->batch_id,
            'product_id'    => $this->product_id,
            'product_name'  => $this->product?->product_name,
            'sku'           => $this->product?->barcode,
            'category'      => $this->product?->category?->Category_name ?? '',
            'batch_number'  => $this->batch_number,
            'quantity'      => $this->quantity,
            'expiry_date'   => $this->expiry_date,
            'days_left'     => now()->diffInDays(Carbon::parse($this->expiry_date), false),
            'status'        => $this->status,
            'directive_notes' => $this->directive_notes,
            'created_by'    => $this->creator?->Full_name ?? 'System',
            'created_at'    => $this->created_at,
            'business_id'   => $this->business_id,
            'branch_id'     => $this->branch_id,
            'received_date' => $this->received_date,
            'received_temperature' => $this->received_temperature,
            'supplier_batch_number' => $this->supplier_batch_number,
        ];
    }
}
