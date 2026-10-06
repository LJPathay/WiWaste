<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'business_id' => 'sometimes|integer|exists:businesses,id',
            'branch_id' => 'sometimes|integer|exists:branches,id',
            'product_id' => 'required|integer|exists:Product,product_id',
            'batch_id' => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'counted_qty' => 'required|integer|min:0',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
