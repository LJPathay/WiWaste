<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveStockReceivingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'received_by' => 'sometimes|integer|exists:User,User_id',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.receiving_item_id' => 'required|integer|exists:stock_receiving_items,receiving_item_id',
            'items.*.temperature_at_receipt' => 'nullable|numeric',
            'items.*.condition_check_passed' => 'nullable|boolean',
            'items.*.sanitation_check_passed' => 'nullable|boolean',
            'items.*.received_quantity' => 'required|integer|min:1',
            'items.*.rejected_quantity' => 'nullable|integer|min:0',
            'items.*.notes' => 'nullable|string|max:500',
        ];
    }
}
