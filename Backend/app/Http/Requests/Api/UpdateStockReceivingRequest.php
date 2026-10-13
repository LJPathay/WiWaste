<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockReceivingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'sometimes|integer|exists:Supplier,supplier_id',
            'received_by' => 'sometimes|integer|exists:User,User_id',
            'verified_by' => 'nullable|integer|exists:User,User_id',
            'received_at' => 'sometimes|date',
            'verified_at' => 'nullable|date',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
            'status' => 'sometimes|in:pending,received,verified,rejected,partial',
        ];
    }
}
