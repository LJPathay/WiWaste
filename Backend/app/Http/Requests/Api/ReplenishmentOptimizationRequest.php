<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ReplenishmentOptimizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'budget'              => 'required|numeric|gt:0',
            'horizon_days'        => 'sometimes|integer|min:1|max:365',
            'include_product_ids' => 'sometimes|array',
            'include_product_ids.*' => 'integer',
            'persist'             => 'sometimes|boolean',
            'seed'                => 'sometimes|integer',
        ];
    }
}
