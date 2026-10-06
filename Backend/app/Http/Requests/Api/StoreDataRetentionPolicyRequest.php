<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDataRetentionPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'entity_type' => 'required|string|max:100',
            'retention_days' => 'required|integer|min:1',
            'description' => 'nullable|string|max:500',
            'enabled' => 'nullable|boolean',
        ];
    }
}
