<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_name'    => 'sometimes|string|max:150',
            'contact_person'   => 'nullable|string|max:100',
            'contact_number'   => 'sometimes|string|max:20',
            'address'          => 'nullable|string|max:255',
            'fda_lto_number'   => 'nullable|string|max:50',
            'fda_lto_expiry'   => 'nullable|date',
            'fda_cpr_number'   => 'nullable|string|max:50',
            'fda_cpr_expiry'   => 'nullable|date',
        ];
    }
}