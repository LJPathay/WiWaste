<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
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
            'type' => $this->type ?? null,
            'title' => $this->title ?? null,
            'message' => $this->message ?? null,
            'read' => (bool) ($this->read ?? false),
            'read_at' => $this->read_at ?? null,
            'created_at' => $this->created_at ?? null,
        ];
    }
}
