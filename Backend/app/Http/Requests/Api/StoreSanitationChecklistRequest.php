<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreSanitationChecklistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'business_id' => 'sometimes|integer|exists:businesses,id',
            'branch_id'   => 'sometimes|integer|exists:branches,id',
            'checklist_date' => 'required|date',
            'frequency'   => 'required|in:daily,weekly,monthly',
            'area'        => 'required|in:receiving,storage,preparation,dispensing,waste,general',
            'checks'      => 'required|array|min:1',
            'checks.*.item'       => 'required|string|max:255',
            'checks.*.passed'     => 'required|boolean',
            'checks.*.notes'      => 'nullable|string|max:500',
            'checks.*.photo_url'  => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ];
    }
}
