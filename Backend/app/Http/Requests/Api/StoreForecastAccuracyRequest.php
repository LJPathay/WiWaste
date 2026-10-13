<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreForecastAccuracyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|integer',
            'forecast_date' => 'required|date',
            'predicted_value' => 'required|numeric|min:0',
            'actual_value' => 'nullable|numeric|min:0',
            'model_version' => 'nullable|string|max:50',
        ];
    }
}
