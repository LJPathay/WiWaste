<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ValidatesStockReceivingItems;
use Illuminate\Foundation\Http\FormRequest;

class StoreStockReceivingRequest extends FormRequest
{
    use ValidatesStockReceivingItems;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return array_merge(
            $this->receivingHeaderRules(),
            ['items' => 'sometimes|array'],
            $this->prefixedItemRules()
        );
    }

    /**
     * Prefixes every item rule with `items.*.` so the validator descends into
     * each element of the `items` array.
     *
     * @return array<string, string>
     */
    private function prefixedItemRules(): array
    {
        $prefixed = [];
        foreach ($this->itemRules() as $field => $rule) {
            $prefixed['items.*.'.$field] = $rule;
        }

        return $prefixed;
    }
}
