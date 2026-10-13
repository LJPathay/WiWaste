<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->inventory_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product?->product_name,
            'sku' => $this->product?->barcode,
            'category' => $this->product?->category?->Category_name ?? '',
            'category_id' => $this->product?->category_id,
            'cost_price' => (float) ($this->product?->cost_price ?? 0),
            'selling_price' => (float) ($this->product?->selling_price ?? 0),
            'supplier' => $this->product?->supplier?->supplier_name ?? '',
            'supplier_id' => $this->product?->supplier_id,
            'current_stock' => $this->current_stock,
            'stock_status' => $this->stock_status,
            'reorder_level' => $this->product?->reorder_level,
            'expiration_date' => $this->product?->expiration_date,
            'last_updated' => $this->last_updated,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
        ];
    }
}
