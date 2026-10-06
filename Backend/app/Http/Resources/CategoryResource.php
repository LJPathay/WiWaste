<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->Category_id,
            'name' => $this->Category_name,
            'product_count' => $this->products_count ?? $this->products()->count(),
            'status' => $this->status,
        ];
    }
}
