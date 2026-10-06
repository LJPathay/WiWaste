<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ReceivePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.po_item_id' => 'required|integer|exists:Purchase_Order_Item,po_item_id',
            'items.*.received_qty' => 'required|integer|min:0',
        ];
    }
}
