<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorReturnResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'vendor_return_id' => $this->vendor_return_id,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
            'supplier_id' => $this->supplier_id,
            'created_by' => $this->created_by,
            'approved_by' => $this->approved_by,
            'return_number' => $this->return_number,
            'status' => $this->status,
            'return_reason_code' => $this->return_reason_code,
            'notes' => $this->notes,
            'total_credit_amount' => $this->total_credit_amount,
            'requested_date' => $this->requested_date,
            'approved_date' => $this->approved_date,
            'shipped_date' => $this->shipped_date,
            'received_date' => $this->received_date,
            'credited_date' => $this->credited_date,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'supplier' => $this->whenLoaded('supplier'),
            'creator' => $this->whenLoaded('creator'),
            'approver' => $this->whenLoaded('approver'),
            'items' => $this->whenLoaded('items'),
        ];
    }
}
