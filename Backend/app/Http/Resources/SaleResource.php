<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->transaction_id,
            'cashier'           => $this->user?->Full_name ?? 'Cashier',
            'total_amount'      => $this->total_amount,
            'vat_amount'        => $this->vat_amount,
            'vatable_amount'    => $this->vatable_amount,
            'non_vatable_amount' => $this->non_vatable_amount,
            'senior_pwd_discount_amount' => $this->senior_pwd_discount_amount,
            'senior_pwd_vat_exempt_amount' => $this->senior_pwd_vat_exempt_amount,
            'discount_amount'   => $this->discount_amount,
            'discount_breakdown' => $this->discount_breakdown,
            'transaction_date'  => $this->transaction_date,
            'payment_method'    => $this->payment_method,
            'payment_reference' => $this->payment_reference,
            'payment_status'    => $this->payment_status,
            'amount_tendered'   => $this->amount_tendered,
            'change_due'        => $this->change_due,
            'status'            => $this->status,
            'business_id'       => $this->business_id,
            'branch_id'         => $this->branch_id,
            'customer_name'     => $this->customer_name,
            'customer_phone'    => $this->customer_phone,
            'customer_email'    => $this->customer_email,
            'senior_pwd_id'     => $this->senior_pwd_id,
            'senior_pwd_type'   => $this->senior_pwd_type,
            'items'             => $this->salesItems->map(fn ($item) => [
                'id'                 => $item->sales_item_id,
                'product_name'       => $item->product?->product_name,
                'sku'                => $item->product?->barcode,
                'quantity'           => $item->quantity,
                'unit_price'         => $item->unit_price,
                'subtotal'           => $item->subtotal,
                'vat_amount'         => $item->vat_amount,
                'vatable_amount'     => $item->vatable_amount,
                'discount_amount'    => $item->discount_amount,
                'discount_pct'       => $item->discount_pct,
                'is_senior_pwd_exempt' => $item->is_senior_pwd_exempt,
            ]),
        ];
    }
}
