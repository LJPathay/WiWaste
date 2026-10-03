<?php

namespace App\Http\Requests\Api;

use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Mirrors CreateUserRequest so an account cannot be edited into a state the create
     * form would have rejected.
     *
     * This still carried the original hardcoded
     * `in:Admin,Inventory,Business Owner,Cashier,Pharmacist` list. Two things were wrong
     * with it:
     *
     *  - 'Owner' was missing entirely, so the Manage Users edit form — which always sends
     *    the account's current role — returned 422 for every Owner account. The one
     *    account that could manage users could not itself be edited.
     *  - 'Business Owner' was still accepted even though it is not a value the column
     *    can store, which is the same truncation that emptied `role` and crashed the
     *    user list.
     *
     * Validating against the enum keeps the two lists in step with the column.
     */
    public function rules(): array
    {
        return [
            'first_name'     => 'sometimes|required|string|max:50',
            'middle_name'    => 'nullable|string|max:50',
            'surname'        => 'sometimes|required|string|max:50',
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'email'          => 'sometimes|required|email|max:100|unique:User,email,' . $this->route('user') . ',User_id',
            'role'           => ['sometimes', 'required', Rule::enum(Role::class)],
            'status'         => ['sometimes', 'required', Rule::in(['Active', 'Inactive', 'Quarantined', 'Archived'])],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'       => 'Email address is required.',
            'email.unique'         => 'This email address is already registered.',
            'contact_number.regex' => 'Contact number must be 7 to 20 digits.',
        ];
    }
}
