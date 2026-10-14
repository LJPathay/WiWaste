<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CloseShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id' => 'required|string',
            'closing_cash' => 'required|numeric|min:0',
            'remarks' => 'nullable|string|max:500',
        ];
    }
}
