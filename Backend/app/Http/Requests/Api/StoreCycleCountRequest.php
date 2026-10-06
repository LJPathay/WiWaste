<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreCycleCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|integer|exists:inventory,product_id',
            'counted_quantity' => 'required|integer|min:0',
            'batch_id' => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'remarks' => 'nullable|string|max:500',
        ];
    }
}
