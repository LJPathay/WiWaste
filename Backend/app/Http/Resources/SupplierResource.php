<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->supplier_id,
            'name'           => $this->supplier_name,
            'contact_person' => $this->contact_person,
            'contact_number' => $this->contact_number,
            'email'          => $this->email,
            'address'        => $this->address,
            'product_count'  => $this->products_count ?? 0,
            'business_id'    => $this->business_id,
            'fda_lto_number' => $this->fda_lto_number,
            'fda_lto_expiry' => $this->fda_lto_expiry,
            'fda_cpr_number' => $this->fda_cpr_number,
            'fda_cpr_expiry' => $this->fda_cpr_expiry,
        ];
    }
}
