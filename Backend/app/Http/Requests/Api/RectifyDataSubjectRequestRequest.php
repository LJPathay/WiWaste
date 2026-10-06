<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RectifyDataSubjectRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'corrections' => 'required|array|min:1',
            'corrections.*.field' => 'required|string',
            'corrections.*.new_value' => 'required',
        ];
    }
}
