<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Category_name' => 'sometimes|required|string|max:100|unique:Category,Category_name,' . $this->route('category') . ',Category_id',
        ];
    }

    public function messages(): array
    {
        return [
            'Category_name.unique' => 'This category name is already taken.',
        ];
    }
}