<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateDataBreachIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'description' => 'required|string|max:1000',
            'personal_data_affected' => 'required|string|max:1000',
            'risk_assessment' => 'required|in:low,medium,high,critical',
            'detected_at' => 'nullable|date',
            'npc_notification_required' => 'nullable|boolean',
        ];
    }
}
