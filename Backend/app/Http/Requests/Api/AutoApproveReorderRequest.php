<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class AutoApproveReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'criteria' => 'nullable|array',
            'criteria.max_cost_per_po' => 'nullable|numeric|min:0',
            'criteria.min_items_per_po' => 'nullable|integer|min:1',
        ];
    }
}
