<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SanitationChecklistResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'checklist_id' => $this->checklist_id,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
            'created_by' => $this->created_by,
            'checklist_date' => $this->checklist_date,
            'frequency' => $this->frequency,
            'area' => $this->area,
            'checks' => $this->checks,
            'overall_status' => $this->overall_status,
            'verified_by' => $this->verified_by,
            'verified_at' => $this->verified_at,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'creator' => $this->whenLoaded('creator'),
            'verifier' => $this->whenLoaded('verifier'),
        ];
    }
}
