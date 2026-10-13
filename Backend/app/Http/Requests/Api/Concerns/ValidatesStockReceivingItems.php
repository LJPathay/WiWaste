<?php

namespace App\Http\Requests\Api\Concerns;

/**
 * The `items[]` rules every stock-receiving endpoint validates.
 *
 * Store / Receive / Update / Reject / Verify / Discard all describe the same
 * line shape; each used to carry its own copy of the block, so adding a column
 * to a receiving line meant editing six requests. The rules live here once.
 */
trait ValidatesStockReceivingItems
{
    /**
     * @return array<string, string>
     */
    protected function itemRules(): array
    {
        return [
            'product_id' => 'required|integer|exists:Product,product_id',
            'batch_id' => 'nullable|integer|exists:FEFO_Batch,batch_id',
            'po_item_id' => 'nullable|integer|exists:Purchase_Order_Item,po_item_id',
            'expected_quantity' => 'required|integer|min:1',
            'received_quantity' => 'nullable|integer|min:0',
            'rejected_quantity' => 'nullable|integer|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'status' => 'nullable|in:pending,received,partial,rejected',
            'notes' => 'nullable|string|max:500',
        ];
    }

    /**
     * Top-level rules shared by every stock-receiving endpoint.
     *
     * @return array<string, string>
     */
    protected function receivingHeaderRules(): array
    {
        return [
            'business_id' => 'sometimes|integer|exists:businesses,id',
            'branch_id' => 'sometimes|integer|exists:branches,id',
            'supplier_id' => 'required|integer|exists:Supplier,supplier_id',
            'received_by' => 'sometimes|integer|exists:User,User_id',
            'received_at' => 'nullable|date',
            'temperature_at_receipt' => 'nullable|numeric',
            'condition_check_passed' => 'nullable|boolean',
            'sanitation_check_passed' => 'nullable|boolean',
            'notes' => 'nullable|string|max:500',
            'status' => 'nullable|in:pending,received,verified,rejected,partial',
        ];
    }
}
