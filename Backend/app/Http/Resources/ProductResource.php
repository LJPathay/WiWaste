<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->product_id,
            'name' => $this->product_name,
            'sku' => $this->barcode,
            // POS terminals key off the PLU, which is just the numeric product id.
            'plu_code' => (string) $this->product_id,
            'category_id' => $this->category_id,
            'category' => $this->category?->Category_name,
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->supplier?->supplier_name,
            'cost_price' => $this->cost_price,
            'selling_price' => $this->selling_price,
            'reorder_level' => $this->reorder_level,
            'expiration_date' => $this->expiration_date,
            'status' => $this->status ?? 'Active',
            'stock' => $this->inventory?->current_stock ?? 0,
            'stock_status' => $this->inventory?->stock_status ?? 'Normal',
            'business_id' => $this->business_id,
            'product_classification' => $this->product_classification,
            'required_temp_min' => $this->required_temp_min,
            'required_temp_max' => $this->required_temp_max,
            'storage_requirement' => $this->storage_requirement,
            'is_rx_only' => $this->is_rx_only,
            'ddb_schedule' => $this->ddb_schedule,
        ];
    }
}
