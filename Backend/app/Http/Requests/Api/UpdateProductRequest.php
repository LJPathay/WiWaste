<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'category_id'             => 'sometimes|integer|exists:Category,Category_id',
            'supplier_id'             => 'sometimes|integer|exists:Supplier,supplier_id',
            'barcode'                 => 'nullable|string|max:50|unique:Product,barcode,' . $id . ',product_id',
            'product_name'            => 'sometimes|string|max:150',
            'cost_price'              => 'sometimes|numeric|min:0',
            'selling_price'           => 'sometimes|numeric|min:0',
            'reorder_level'           => 'sometimes|integer|min:0',
            'expiration_date'         => 'nullable|date',
            'status'                  => 'sometimes|in:Active,Discontinued',
            'product_classification'  => 'nullable|in:food,drug,cosmetic,device,general',
            'required_temp_min'       => 'nullable|numeric',
            'required_temp_max'       => 'nullable|numeric',
            'storage_requirement'     => 'nullable|in:refrigerated,frozen,controlled_room,ambient,custom',
            'is_rx_only'              => 'nullable|boolean',
            'ddb_schedule'            => 'nullable|string|max:20',
        ];
    }
}
