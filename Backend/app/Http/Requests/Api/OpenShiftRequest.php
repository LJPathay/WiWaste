<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class OpenShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'opening_cash' => 'required|numeric|min:0',
            'cashier_name' => 'nullable|string|max:255',
        ];
    }
}
