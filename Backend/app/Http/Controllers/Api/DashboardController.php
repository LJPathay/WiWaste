<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Models\Supplier;
use App\Models\SalesTransaction;
use App\Models\WastageRecord;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function overview()
    {
        $activeSkus = Product::where('status', 'Active')->count();
        $totalUsers = User::count();
        $activeSuppliers = Supplier::count();
        $todaySales = (float) SalesTransaction::where('status', 'Completed')
            ->whereDate('transaction_date', today())
            ->sum('total_amount');
        $recentWastage = (float) WastageRecord::whereDate('date_recorded', '>=', now()->subDays(7))
            ->sum('estimated_loss');

        return response()->json([
            'active_skus' => $activeSkus,
            'total_users' => $totalUsers,
            'active_suppliers' => $activeSuppliers,
            'today_sales' => $todaySales,
            'recent_wastage' => $recentWastage,
        ]);
    }
}
