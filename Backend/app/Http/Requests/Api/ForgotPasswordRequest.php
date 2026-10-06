<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|exists:User,email',
        ];
    }

    public function messages(): array
    {
        return [
            'email.exists' => 'If an account exists for this email, a reset code will be sent.',
        ];
    }
}
