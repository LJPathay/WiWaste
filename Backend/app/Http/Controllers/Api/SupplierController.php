<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    public function index()
    {
        return response()->json(
            Supplier::withCount('products')->get()->map(fn ($s) => [
                'id'             => $s->supplier_id,
                'name'           => $s->supplier_name,
                'contact_person' => $s->contact_person,
                'contact_number' => $s->contact_number,
                'address'        => $s->address,
                'product_count'  => $s->products_count,
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_name'  => 'required|string|max:150',
            'contact_person' => 'nullable|string|max:100',
            'contact_number' => 'required|string|max:20',
            'address'        => 'nullable|string|max:255',
        ]);
        $supplier = Supplier::create($data);
        return response()->json([
            'id'             => $supplier->supplier_id,
            'name'           => $supplier->supplier_name,
            'contact_person' => $supplier->contact_person,
            'contact_number' => $supplier->contact_number,
            'address'        => $supplier->address,
            'product_count'  => 0,
        ], 201);
    }

    public function show($id)
    {
        $s = Supplier::withCount('products')->findOrFail($id);

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
        ]);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);
        $data     = $request->validate([
            'supplier_name'  => 'sometimes|string|max:150',
            'contact_person' => 'nullable|string|max:100',
            'contact_number' => 'sometimes|string|max:20',
            'address'        => 'nullable|string|max:255',
        ]);
        $supplier->update($data);
        return response()->json([
            'id'             => $supplier->supplier_id,
            'name'           => $supplier->supplier_name,
            'contact_person' => $supplier->contact_person,
            'contact_number' => $supplier->contact_number,
            'address'        => $supplier->address,
            'product_count'  => $supplier->products()->count(),
        ]);
    }

    public function destroy($id)
    {
        Supplier::findOrFail($id)->delete();
        return response()->json(['message' => 'Supplier deleted.']);
    }
}
