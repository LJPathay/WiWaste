<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CreateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'Category_name' => 'required|string|max:100|unique:Category,Category_name',
        ];
    }

    public function messages(): array
    {
        return [
            'Category_name.required' => 'Category name is required.',
            'Category_name.unique'   => 'This category name is already taken.',
        ];
    }
}