<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockReceivingRequest extends FormRequest
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
            'received_by' => 'sometimes|integer|exists:User,User_id',
            'received_at' => 'nullable|date',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
            'status' => 'nullable|in:pending,received,verified,rejected,partial',
            'items' => 'sometimes|array',
            'items.*.product_id' => 'required|integer|exists:Product,product_id',
            'items.*.batch_id' => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'items.*.po_item_id' => 'nullable|integer|exists:Purchase_Order_Item,po_item_id',
            'items.*.expected_quantity' => 'required|integer|min:1',
            'items.*.received_quantity' => 'nullable|integer|min:0',
            'items.*.rejected_quantity' => 'nullable|integer|min:0',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'items.*.temperature_at_receipt' => 'nullable|numeric',
            'items.*.condition_check_passed' => 'nullable|boolean',
            'items.*.sanitation_check_passed' => 'nullable|boolean',
            'items.*.status' => 'nullable|in:pending,received,partial,rejected',
            'items.*.notes' => 'nullable|string|max:500',
        ];
    }
}
