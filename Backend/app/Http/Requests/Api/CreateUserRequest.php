<?php

namespace App\Http\Requests\Api;

use App\Enums\Role;
use App\Enums\UserStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `role` used to be validated with
     * `in:Admin,Inventory,Business Owner,Cashier,Pharmacist` while the column was an
     * ENUM of ('Owner','Inventory','Cashier','Pharmacist'). "Admin" and
     * "Business Owner" therefore passed validation and were then silently truncated by
     * MySQL:
     *
     *   SQLSTATE[01000]: Warning: 1265 Data truncated for column 'role' at row 1
     *
     * leaving the role as an empty string, which is what crashed the Manage Users table
     * with "Cannot read properties of undefined (reading 'toLowerCase')" when the new
     * account was rendered back into the list.
     *
     * Validating against the enum — the same set the column accepts — means an invalid
     * role is a clean 422 instead of a database warning.
     */
    public function rules(): array
    {
        return [
            'first_name'     => 'required|string|max:50',
            'middle_name'    => 'nullable|string|max:50',
            'surname'        => 'required|string|max:50',
            // QA: contact number, 11 digits, numeric only.
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{7,20}$/'],
            'username'       => 'required|string|max:50|unique:User,username',
            'password'       => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/',
            'email'          => 'required|email|max:100|unique:User,email',
            'role'           => ['required', Rule::enum(Role::class)],
            'status'         => ['required', Rule::enum(UserStatus::class)->except([UserStatus::Archived])],
        ];
    }

    public function messages(): array
    {
        return [
            'username.unique'        => 'This username is already taken.',
            'email.required'         => 'Email address is required.',
            'email.unique'           => 'This email address is already registered.',
            'password.regex'         => 'Password must contain uppercase, lowercase, number, and special character.',
            'password.min'           => 'Password must be at least 8 characters long.',
            'contact_number.regex'   => 'Contact number must be 7 to 20 digits.',
        ];
    }
}