<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecallRequest extends FormRequest
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
            'supplier_id' => 'nullable|integer|exists:Supplier,supplier_id',
            'reason'      => 'required|string|max:1000',
            'severity'    => 'required|in:low,medium,high,critical',
            'affected_batches' => 'required|array|min:1',
            'affected_batches.*.batch_id' => 'required|integer|exists:FEFO_Batch,batch_id',
            'affected_batches.*.quantity' => 'required|integer|min:1',
            'target_resolution_date' => 'nullable|date',
        ];
    }
}
