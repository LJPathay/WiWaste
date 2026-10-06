<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreReturnTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sale_item_id' => 'required|integer|exists:Sales_Item,sales_item_id',
            'quantity_returned' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:255',
            'return_reason_code' => 'required|in:defective,wrong_item,change_mind,damaged,expired,missing_parts,not_as_described,other',
            'evidence_notes' => 'nullable|string|max:1000',
            'evidence_photos' => 'nullable|array',
            'refund_amount' => 'required|numeric|min:0',
            'return_date' => 'required|date',
        ];
    }
}
