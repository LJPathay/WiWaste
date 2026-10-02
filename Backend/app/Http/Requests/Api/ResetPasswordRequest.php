<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|exists:User,email',
            'otp' => 'required|digits:6',
            'password' => 'required|string|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/',
            'password_confirmation' => 'required|same:password',
        ];
    }

    public function messages(): array
    {
        return [
            'password.regex' => 'Password must contain uppercase, lowercase, number, and special character.',
            'password_confirmation.same' => 'Passwords do not match.',
        ];
    }
}