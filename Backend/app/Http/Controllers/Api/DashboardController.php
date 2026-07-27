<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Models\Supplier;
use App\Models\SalesTransaction;
use App\Models\WastageRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function overview()
    {
        $data = Cache::remember('dashboard.overview', 300, function () {
            return [
                'active_skus' => Product::where('status', 'Active')->count(),
                'total_users' => User::count(),
                'active_suppliers' => Supplier::count(),
                'today_sales' => (float) SalesTransaction::where('status', 'Completed')
                    ->whereDate('transaction_date', today())
                    ->sum('total_amount'),
                'recent_wastage' => (float) WastageRecord::whereDate('date_recorded', '>=', now()->subDays(7))
                    ->sum('estimated_loss'),
            ];
        });

        return response()->json($data);
    }
}
