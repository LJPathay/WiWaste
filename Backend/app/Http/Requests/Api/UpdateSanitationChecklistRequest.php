<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSanitationChecklistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'checklist_date' => 'sometimes|date',
            'frequency'      => 'sometimes|in:daily,weekly,monthly',
            'area'           => 'sometimes|in:receiving,storage,preparation,dispensing,waste,general',
            'checks'         => 'sometimes|array|min:1',
            'checks.*.item'       => 'required|string|max:255',
            'checks.*.passed'     => 'required|boolean',
            'checks.*.notes'      => 'nullable|string|max:500',
            'checks.*.photo_url'  => 'nullable|string|max:500',
            'notes'          => 'nullable|string|max:1000',
        ];
    }
}
