<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'     => 'sometimes|required|string|max:50',
            'middle_name'    => 'nullable|string|max:50',
            'surname'        => 'sometimes|required|string|max:50',
            'contact_number' => 'nullable|string|max:20',
            'email'          => 'sometimes|nullable|email|max:100|unique:User,email,' . $this->route('user') . ',User_id',
            'role'           => 'sometimes|required|in:Admin,Inventory,Business Owner,Cashier,Pharmacist',
            'status'         => 'sometimes|required|in:Active,Inactive,Quarantined,Archived',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already registered.',
        ];
    }
}