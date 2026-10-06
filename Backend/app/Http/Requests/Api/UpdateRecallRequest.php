<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRecallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reason'               => 'sometimes|string|max:1000',
            'severity'             => 'sometimes|in:low,medium,high,critical',
            'target_resolution_date' => 'nullable|date',
            'affected_batches'     => 'sometimes|array|min:1',
            'affected_batches.*.batch_id' => 'required|integer|exists:FEFO_Batch,batch_id',
            'affected_batches.*.quantity' => 'required|integer|min:1',
            'resolution_notes'     => 'nullable|string|max:1000',
        ];
    }
}
