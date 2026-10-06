<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreWastageRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'business_id'     => 'sometimes|integer|exists:businesses,id',
            'branch_id'       => 'sometimes|integer|exists:branches,id',
            'product_id'      => 'required|integer|exists:Product,product_id',
            'batch_id'        => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'wastage_type'    => 'required|in:Expired,Damaged,Spoiled,Lost,Recalled,Other',
            'quantity'        => 'required|integer|min:1',
            'estimated_loss'  => 'required|numeric|min:0',
            'date_recorded'   => 'required|date',
        ];
    }
}
