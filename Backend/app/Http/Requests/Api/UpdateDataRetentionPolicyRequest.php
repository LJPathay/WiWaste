<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDataRetentionPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'retention_days' => 'sometimes|integer|min:1',
            'description' => 'nullable|string|max:500',
            'enabled' => 'sometimes|boolean',
        ];
    }
}
