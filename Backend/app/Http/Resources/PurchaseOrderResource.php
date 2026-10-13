<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->po_id,
            'po_number' => $this->po_number,
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->supplier?->supplier_name,
            'user' => $this->user?->Full_name,
            'status' => $this->status,
            'total_amount' => (float) $this->total_amount,
            'notes' => $this->notes,
            'business_id' => $this->business_id,
            'branch_id' => $this->branch_id,
            'items' => $this->items->map(fn ($i) => [
                'id' => $i->po_item_id,
                'product_id' => $i->product_id,
                'product' => $i->product?->product_name,
                'quantity' => $i->quantity,
                'unit_price' => (float) $i->unit_price,
                'subtotal' => (float) $i->subtotal,
                'received_qty' => $i->received_qty,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
