<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateDataSubjectRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'request_type' => 'required|in:access,rectification,erasure,portability,restriction,objection',
            'subject_identifier' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
