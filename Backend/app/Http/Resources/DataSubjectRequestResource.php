<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DataSubjectRequestResource extends JsonResource
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
            'request_type' => $this->request_type,
            'subject_identifier' => $this->subject_identifier,
            'status' => $this->status,
            'notes' => $this->notes,
            'requested_at' => $this->requested_at,
            'completed_at' => $this->completed_at,
            'business' => $this->whenLoaded('business'),
        ];
    }
}
