<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ApproveReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'suggestions' => 'required|array|min:1',
            'suggestions.*.supplier_id' => 'required|integer|exists:Supplier,supplier_id',
            'suggestions.*.items' => 'required|array|min:1',
            'suggestions.*.items.*.product_id' => 'required|integer|exists:Product,product_id',
            'suggestions.*.items.*.adjusted_quantity' => 'required|integer|min:1',
            'suggestions.*.items.*.unit_cost' => 'required|numeric|min:0',
        ];
    }
}
