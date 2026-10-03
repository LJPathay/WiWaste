<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Mirrors CreateSupplierRequest so a supplier cannot be edited into a state the
     * create form would have rejected. `email` is required whenever it is sent at all,
     * and is `sometimes` so a partial update that omits it leaves the stored value
     * untouched.
     */
    public function rules(): array
    {
        return [
            'supplier_name'    => 'sometimes|required|string|max:150',
            'contact_person'   => 'sometimes|required|string|max:100',
            'contact_number'   => ['sometimes', 'required', 'string', 'regex:/^\d{11}$/'],
            'email'            => 'sometimes|required|email|max:150',
            'address'          => 'sometimes|required|string|max:255',
            'fda_lto_number'   => 'nullable|string|max:50',
            'fda_lto_expiry'   => 'nullable|date',
            'fda_cpr_number'   => 'nullable|string|max:50',
            'fda_cpr_expiry'   => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_name.required'     => 'Supplier name is required.',
            'contact_person.required'    => 'Contact person is required.',
            'contact_number.required'    => 'Contact number is required.',
            'contact_number.regex'       => 'Contact number must be exactly 11 digits, numbers only.',
            'email.required'             => 'Email address is required.',
            'email.email'                => 'Email address must be a valid email address.',
            'address.required'           => 'Address is required.',
        ];
    }
}
