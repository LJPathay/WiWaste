<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreWastageFlagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'business_id' => 'sometimes|integer|exists:businesses,id',
            'branch_id'   => 'sometimes|integer|exists:branches,id',
            'product_id'  => 'required|integer|exists:Product,product_id',
            'batch_id'    => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'quantity'    => 'required|integer|min:1',
            'reason'      => 'required|in:expired,damaged,recalled,spoiled,other',
            'notes'       => 'nullable|string|max:500',
        ];
    }
}
