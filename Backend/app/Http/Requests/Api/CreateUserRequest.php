<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'     => 'required|string|max:50',
            'middle_name'    => 'nullable|string|max:50',
            'surname'        => 'required|string|max:50',
            'contact_number' => 'nullable|string|max:20',
            'username'       => 'required|string|max:50|unique:User,username',
            'password'       => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/',
            'email'          => 'required|email|max:100|unique:User,email',
            'role'           => 'required|in:Admin,Inventory,Business Owner,Cashier,Pharmacist',
            'status'         => 'required|in:Active,Inactive,Quarantined',
        ];
    }

    public function messages(): array
    {
        return [
            'username.unique'  => 'This username is already taken.',
            'email.required'   => 'Email address is required.',
            'email.unique'     => 'This email address is already registered.',
            'password.regex'   => 'Password must contain uppercase, lowercase, number, and special character.',
        ];
    }
}