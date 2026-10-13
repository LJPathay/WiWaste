<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReturnTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->return_id,
            'product_name' => $this->salesItem?->product?->product_name,
            'sku' => $this->salesItem?->product?->barcode,
            'returned_by' => $this->user?->Full_name ?? 'System',
            'quantity_returned' => $this->quantity_returned,
            'reason' => $this->reason,
            'return_reason_code' => $this->return_reason_code,
            'evidence_notes' => $this->evidence_notes,
            'evidence_photos' => $this->evidence_photos,
            'refund_amount' => $this->refund_amount,
            'return_date' => $this->return_date,
            'approval_status' => $this->approval_status,
            'approved_by' => $this->approver?->Full_name,
            'approved_at' => $this->approved_at,
            'rejection_reason' => $this->rejection_reason,
            'is_within_7_days' => $this->is_within_7_days,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
        ];
    }
}
