<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class VerifyStockReceivingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'verified_by' => 'sometimes|integer|exists:User,User_id',
            'notes' => 'nullable|string|max:500',
            'items' => 'sometimes|array',
            'items.*.receiving_item_id' => 'required|integer|exists:stock_receiving_items,receiving_item_id',
            'items.*.temperature_at_receipt' => 'nullable|numeric',
            'items.*.condition_check_passed' => 'nullable|boolean',
            'items.*.sanitation_check_passed' => 'nullable|boolean',
            'items.*.received_quantity' => 'nullable|integer|min:0',
            'items.*.rejected_quantity' => 'nullable|integer|min:0',
            'items.*.status' => 'nullable|in:pending,received,partial,rejected',
            'items.*.notes' => 'nullable|string|max:500',
        ];
    }
}
