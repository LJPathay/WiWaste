<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    protected function scopeForBusiness($query, Request $request)
    {
        $user = $request->user();
        if ($user && $user->business_id) {
            $query->where('business_id', $user->business_id);
        }
        return $query;
    }

    public function index(Request $request)
    {
        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, $request);

        return response()->json(
            $query->get()->map(fn ($s) => [
                'id'             => $s->supplier_id,
                'name'           => $s->supplier_name,
                'contact_person' => $s->contact_person,
                'contact_number' => $s->contact_number,
                'address'        => $s->address,
                'product_count'  => $s->products_count,
                'business_id'    => $s->business_id,
                'fda_lto_number' => $s->fda_lto_number,
                'fda_lto_expiry' => $s->fda_lto_expiry,
                'fda_cpr_number' => $s->fda_cpr_number,
                'fda_cpr_expiry' => $s->fda_cpr_expiry,
            ])
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'supplier_name'    => 'required|string|max:150',
            'contact_person'   => 'nullable|string|max:100',
            'contact_number'   => 'required|string|max:20',
            'address'          => 'nullable|string|max:255',
            'business_id'      => 'sometimes|integer|exists:businesses,id',
            'fda_lto_number'   => 'nullable|string|max:50',
            'fda_lto_expiry'   => 'nullable|date',
            'fda_cpr_number'   => 'nullable|string|max:50',
            'fda_cpr_expiry'   => 'nullable|date',
        ]);

        // Auto-assign business_id from user if not provided
        if (!isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }

        $supplier = Supplier::create($data);

        return response()->json([
            'id'             => $supplier->supplier_id,
            'name'           => $supplier->supplier_name,
            'contact_person' => $supplier->contact_person,
            'contact_number' => $supplier->contact_number,
            'address'        => $supplier->address,
            'product_count'  => 0,
            'business_id'    => $supplier->business_id,
            'fda_lto_number' => $supplier->fda_lto_number,
            'fda_lto_expiry' => $supplier->fda_lto_expiry,
            'fda_cpr_number' => $supplier->fda_cpr_number,
            'fda_cpr_expiry' => $supplier->fda_cpr_expiry,
        ], 201);
    }

    public function show($id)
    {
        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, request());
        $s = $query->findOrFail($id);

        $lowStockCount = DB::table('Inventory as i')
            ->join('Product as p', 'i.product_id', '=', 'p.product_id')
            ->where('p.supplier_id', $id)
            ->where('i.stock_status', 'Low Stock')
            ->count();

        $totalProducts = $s->products_count;

        $recentProducts = $s->products()
            ->join('Inventory as i', 'Product.product_id', '=', 'i.product_id')
            ->select('Product.product_id', 'Product.product_name', 'i.current_stock', 'i.stock_status')
            ->limit(5)
            ->get();

        return response()->json([
            'id'             => $s->supplier_id,
            'name'           => $s->supplier_name,
            'contact_person' => $s->contact_person,
            'contact_number' => $s->contact_number,
            'address'        => $s->address,
            'product_count'  => $totalProducts,
            'low_stock_count' => $lowStockCount,
            'recent_products' => $recentProducts,
            'business_id'    => $s->business_id,
            'fda_lto_number' => $s->fda_lto_number,
            'fda_lto_expiry' => $s->fda_lto_expiry,
            'fda_cpr_number' => $s->fda_cpr_number,
            'fda_cpr_expiry' => $s->fda_cpr_expiry,
        ]);
    }

    public function update(Request $request, $id)
    {
        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, $request);
        $supplier = $query->findOrFail($id);

        $data = $request->validate([
            'supplier_name'    => 'sometimes|string|max:150',
            'contact_person'   => 'nullable|string|max:100',
            'contact_number'   => 'sometimes|string|max:20',
            'address'          => 'nullable|string|max:255',
            'fda_lto_number'   => 'nullable|string|max:50',
            'fda_lto_expiry'   => 'nullable|date',
            'fda_cpr_number'   => 'nullable|string|max:50',
            'fda_cpr_expiry'   => 'nullable|date',
        ]);

        $supplier->update($data);

        return response()->json([
            'id'             => $supplier->supplier_id,
            'name'           => $supplier->supplier_name,
            'contact_person' => $supplier->contact_person,
            'contact_number' => $supplier->contact_number,
            'address'        => $supplier->address,
            'product_count'  => $supplier->products()->count(),
            'business_id'    => $supplier->business_id,
            'fda_lto_number' => $supplier->fda_lto_number,
            'fda_lto_expiry' => $supplier->fda_lto_expiry,
            'fda_cpr_number' => $supplier->fda_cpr_number,
            'fda_cpr_expiry' => $supplier->fda_cpr_expiry,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, $request);
        $query->findOrFail($id)->delete();

        return response()->json(['message' => 'Supplier deleted.']);
    }
}