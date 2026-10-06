<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StockOutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id'      => 'required|integer|exists:Product,product_id',
            'quantity'        => 'required|integer|min:1',
            'remarks'         => 'nullable|string|max:255',
            'override_reason' => 'nullable|string|max:255',
            'batch_id'        => 'nullable|integer|exists:FEFO_Batch,batch_id',
        ];
    }
}
