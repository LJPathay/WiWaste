<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveVendorReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'sometimes|array',
            'items.*.vendor_return_item_id' => 'required|integer|exists:Vendor_Return_Items,vendor_return_item_id',
            'items.*.received_quantity' => 'required|integer|min:0',
            'items.*.rejected_quantity' => 'nullable|integer|min:0',
            'items.*.rejection_reason' => 'nullable|string|max:255',
        ];
    }
}
