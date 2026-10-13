<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreVendorReturnRequest extends FormRequest
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
            'supplier_id' => 'required|integer|exists:Supplier,supplier_id',
            'return_reason_code' => 'required|in:overstock,near_expiry,damaged,wrong_shipment,quality_issue,recall,expired,other',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:Product,product_id',
            'items.*.batch_id' => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.reason' => 'nullable|string|max:500',
        ];
    }
}
