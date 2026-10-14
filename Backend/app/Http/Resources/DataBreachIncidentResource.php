<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DataBreachIncidentResource extends JsonResource
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
            'business_id' => $this->business_id,
            'detected_at' => $this->detected_at,
            'description' => $this->description,
            'personal_data_affected' => $this->personal_data_affected,
            'risk_assessment' => $this->risk_assessment,
            'npc_notification_required' => (bool) $this->npc_notification_required,
            'npc_notified_at' => $this->npc_notified_at,
            'subjects_notified_at' => $this->subjects_notified_at,
            'status' => $this->status,
            'resolved_at' => $this->resolved_at,
            'business' => $this->whenLoaded('business'),
        ];
    }
}
