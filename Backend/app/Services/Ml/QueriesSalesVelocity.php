<?php

namespace App\Services\Ml;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

trait QueriesSalesVelocity
{
    protected function salesByWindow(int $days): Collection
    {
        return DB::table('Sales_Item')
            ->join('Sales_Transaction', 'Sales_Transaction.transaction_id', '=', 'Sales_Item.transaction_id')
            ->where('Sales_Transaction.status', 'Completed')
            ->whereBetween('Sales_Transaction.transaction_date', [now()->subDays($days), now()])
            ->select('Sales_Item.product_id', DB::raw('SUM(Sales_Item.quantity) AS total'))
            ->groupBy('Sales_Item.product_id')
            ->get();
    }
}
