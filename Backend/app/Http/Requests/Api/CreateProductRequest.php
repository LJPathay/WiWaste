<?php

namespace App\Http\Requests\Api;

use App\Enums\ProductStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'business_id'             => 'sometimes|integer|exists:businesses,id',
            'category_id'             => 'required|integer|exists:Category,Category_id',
            'supplier_id'             => 'required|integer|exists:Supplier,supplier_id',
            'barcode'                 => 'nullable|string|max:50|unique:Product,barcode',
            'product_name'            => 'required|string|max:150',
            'cost_price'              => 'required|numeric|min:0',
            'selling_price'           => 'required|numeric|min:0',
            'reorder_level'           => 'required|integer|min:0',
            'expiration_date'         => 'nullable|date',
            'status'                  => ['nullable', Rule::enum(ProductStatus::class)],
            'initial_stock'           => 'nullable|integer|min:0',
            'product_classification'  => 'nullable|in:food,drug,cosmetic,device,general',
            'required_temp_min'       => 'nullable|numeric',
            'required_temp_max'       => 'nullable|numeric',
            'storage_requirement'     => 'nullable|in:refrigerated,frozen,controlled_room,ambient,custom',
            'is_rx_only'              => 'nullable|boolean',
            'ddb_schedule'            => 'nullable|string|max:20',
        ];
    }
}
