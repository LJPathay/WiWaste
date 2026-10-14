<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockReceivingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receiving_id' => $this->receiving_id,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
            'supplier_id' => $this->supplier_id,
            'received_by' => $this->received_by,
            'verified_by' => $this->verified_by,
            'received_at' => $this->received_at,
            'verified_at' => $this->verified_at,
            'temperature_at_receipt' => $this->temperature_at_receipt,
            'condition_check_passed' => $this->condition_check_passed,
            'sanitation_check_passed' => $this->sanitation_check_passed,
            'notes' => $this->notes,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'supplier' => $this->whenLoaded('supplier'),
            'receiver' => $this->whenLoaded('receiver'),
            'verifier' => $this->whenLoaded('verifier'),
            'items' => $this->whenLoaded('items'),
        ];
    }
}
