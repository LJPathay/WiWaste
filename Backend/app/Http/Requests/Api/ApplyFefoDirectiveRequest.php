<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ApplyFefoDirectiveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'batch_id' => 'required|integer|exists:FEFO_Batch,batch_id',
            'action' => 'required|in:flag,clear,notify',
            'directive_notes' => 'nullable|string|max:500',
        ];
    }
}
