<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDataSubjectRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'business_id' => 'required|exists:businesses,id',
            'request_type' => 'required|in:access,rectification,erasure,portability,restriction,objection',
            'subject_identifier' => 'required|string|max:255',
        ];
    }
}
