<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_name'    => 'required|string|max:150',
            'contact_person'   => 'nullable|string|max:100',
            'contact_number'   => 'required|string|max:20',
            'address'          => 'nullable|string|max:255',
            'business_id'      => 'sometimes|integer|exists:businesses,id',
            'fda_lto_number'   => 'nullable|string|max:50',
            'fda_lto_expiry'   => 'nullable|date',
            'fda_cpr_number'   => 'nullable|string|max:50',
            'fda_cpr_expiry'   => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_name.required'  => 'Supplier name is required.',
            'contact_number.required' => 'Contact number is required.',
        ];
    }
}