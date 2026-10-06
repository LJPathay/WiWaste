<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_method'             => 'required|in:Cash,E-wallet,Credit Card,Debit Card',
            'payment_reference'          => 'nullable|string|max:100',
            'amount_tendered'            => 'nullable|numeric|min:0',
            'change_due'                 => 'nullable|numeric|min:0',
            'senior_pwd_name'            => 'nullable|string|max:100',
            'senior_pwd_id'              => 'nullable|string|max:50',
            'senior_pwd_type'            => 'nullable|in:senior,pwd,none',
            'customer_name'              => 'nullable|string|max:255',
            'customer_phone'             => 'nullable|string|max:20',
            'customer_email'             => 'nullable|string|max:255',
            'items'                      => 'required|array|min:1',
            'items.*.product_id'         => 'required|integer|exists:Product,product_id',
            'items.*.quantity'           => 'required|integer|min:1',
            'items.*.unit_price'         => 'required|numeric|min:0',
            'items.*.discount_pct'       => 'nullable|numeric|min:0|max:1',
            'items.*.discount_amount'    => 'nullable|numeric|min:0',
            'items.*.override_reason'    => 'nullable|string|max:255',
        ];
    }
}
