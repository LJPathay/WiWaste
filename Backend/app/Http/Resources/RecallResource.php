<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecallResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'recall_id' => $this->recall_id,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
            'recall_number' => $this->recall_number,
            'product_id' => $this->product_id,
            'batch_id' => $this->batch_id,
            'supplier_id' => $this->supplier_id,
            'reason' => $this->reason,
            'severity' => $this->severity,
            'status' => $this->status,
            'affected_batches' => $this->affected_batches,
            'total_quantity_affected' => $this->total_quantity_affected,
            'initiated_date' => $this->initiated_date,
            'target_resolution_date' => $this->target_resolution_date,
            'actual_resolution_date' => $this->actual_resolution_date,
            'initiated_by' => $this->initiated_by,
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at,
            'resolution_notes' => $this->resolution_notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'product' => $this->whenLoaded('product'),
            'batch' => $this->whenLoaded('batch'),
            'supplier' => $this->whenLoaded('supplier'),
            'initiator' => $this->whenLoaded('initiator'),
            'approver' => $this->whenLoaded('approver'),
        ];
    }
}
