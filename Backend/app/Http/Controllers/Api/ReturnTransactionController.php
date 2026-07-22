<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReturnTransaction;
use App\Models\SalesItem;
use App\Models\Inventory;
use Illuminate\Http\Request;

class ReturnTransactionController extends Controller
{
    public function index(Request $request)
    {
        $limit = min((int) $request->input('per_page', 200), 1000);
        return response()->json(
            ReturnTransaction::with(['saleItem.product', 'user'])->orderByDesc('return_date')->take($limit)->get()->map(fn ($r) => [
                'id'                => $r->return_id,
                'product_name'      => $r->saleItem?->product?->product_name,
                'sku'               => $r->saleItem?->product?->barcode,
                'returned_by'       => $r->user?->Full_name ?? 'System',
                'quantity_returned' => $r->quantity_returned,
                'reason'            => $r->reason,
                'refund_amount'     => $r->refund_amount,
                'return_date'       => $r->return_date,
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sale_item_id'      => 'required|integer|exists:Sales_Item,sales_item_id',
            'quantity_returned' => 'required|integer|min:1',
            'reason'            => 'nullable|string|max:255',
            'refund_amount'     => 'required|numeric|min:0',
            'return_date'       => 'required|date',
        ]);

        $data['user_id'] = $request->user()?->User_id ?? 1;

        $return = ReturnTransaction::create($data);

        // Add stock back
        $saleItem = SalesItem::find($data['sale_item_id']);
        if ($saleItem) {
            $inventory = Inventory::where('product_id', $saleItem->product_id)->first();
            if ($inventory) {
                $inventory->current_stock += $data['quantity_returned'];
                $inventory->stock_status   = $inventory->current_stock > 0 ? 'Normal' : 'Low Stock';
                $inventory->last_updated   = now();
                $inventory->save();
            }
        }

        return response()->json(['message' => 'Return recorded.', 'id' => $return->return_id], 201);
    }
}
