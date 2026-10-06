<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id'   => 'required|integer|exists:Product,product_id',
            'quantity'     => 'required|integer|min:1',
            'batch_number' => 'required|string|max:50',
            'expiry_date'  => 'required|date|after_or_equal:today',
            'remarks'      => 'nullable|string|max:255',
        ];
    }
}
