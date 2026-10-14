<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StockInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|integer|exists:Product,product_id',
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string|max:255',
        ];
    }
}
