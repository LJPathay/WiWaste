<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * QA requires the supplier form to capture a name, contact person, phone number,
     * email address and address, and to accept only an 11-digit numeric phone number.
     *
     * `contact_number` was `required|string|max:20`, so any 20-character run of letters
     * and symbols was accepted and stored as a supplier's phone number.
     */
    public function rules(): array
    {
        return [
            'supplier_name' => 'required|string|max:150',
            'contact_person' => 'required|string|max:100',
            'contact_number' => ['required', 'string', 'regex:/^\d{11}$/'],
            'email' => 'required|email|max:150',
            'address' => 'required|string|max:255',
            'business_id' => 'sometimes|integer|exists:businesses,id',
            'fda_lto_number' => 'nullable|string|max:50',
            'fda_lto_expiry' => 'nullable|date',
            'fda_cpr_number' => 'nullable|string|max:50',
            'fda_cpr_expiry' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_name.required' => 'Supplier name is required.',
            'contact_person.required' => 'Contact person is required.',
            'contact_number.required' => 'Contact number is required.',
            'contact_number.regex' => 'Contact number must be exactly 11 digits, numbers only.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Email address must be a valid email address.',
            'address.required' => 'Address is required.',
        ];
    }
}
