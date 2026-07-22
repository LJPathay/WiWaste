<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Inventory;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        return response()->json(
            Product::with(['category', 'supplier', 'inventory'])->get()->map(fn ($p) => [
                'id'              => $p->product_id,
                'name'            => $p->product_name,
                'sku'             => $p->barcode,
                'category_id'     => $p->category_id,
                'category'        => $p->category?->Category_name,
                'supplier_id'     => $p->supplier_id,
                'supplier'        => $p->supplier?->supplier_name,
                'cost_price'      => $p->cost_price,
                'selling_price'   => $p->selling_price,
                'reorder_level'   => $p->reorder_level,
                'expiration_date' => $p->expiration_date,
                'status'          => $p->status ?? 'Active',
                'stock'           => $p->inventory?->current_stock ?? 0,
                'stock_status'    => $p->inventory?->stock_status ?? 'Normal',
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category_id'     => 'required|integer|exists:Category,Category_id',
            'supplier_id'     => 'required|integer|exists:Supplier,supplier_id',
            'barcode'         => 'nullable|string|max:50|unique:Product,barcode',
            'product_name'    => 'required|string|max:150',
            'cost_price'      => 'required|numeric|min:0',
            'selling_price'   => 'required|numeric|min:0',
            'reorder_level'   => 'required|integer|min:0',
            'expiration_date' => 'nullable|date',
            'status'          => 'nullable|in:Active,Discontinued',
            'initial_stock'   => 'nullable|integer|min:0',
        ]);

        $initialStock = $data['initial_stock'] ?? 0;
        unset($data['initial_stock']);

        $product = Product::create($data);

        // Auto-create inventory record
        $stockStatus = $initialStock <= 0 ? 'Low Stock' : ($initialStock > 100 ? 'Overstock' : 'Normal');
        Inventory::create([
            'product_id'   => $product->product_id,
            'current_stock' => $initialStock,
            'stock_status' => $stockStatus,
            'last_updated' => now(),
        ]);

        return response()->json([
            'message' => 'Product created.',
            'id'      => $product->product_id,
            'sku'     => $product->barcode,
        ], 201);
    }

    public function show($id)
    {
        $p = Product::with(['category', 'supplier', 'inventory'])->findOrFail($id);
        return response()->json([
            'id'              => $p->product_id,
            'name'            => $p->product_name,
            'sku'             => $p->barcode,
            'category_id'     => $p->category_id,
            'category'        => $p->category?->Category_name,
            'supplier_id'     => $p->supplier_id,
            'supplier'        => $p->supplier?->supplier_name,
            'cost_price'      => $p->cost_price,
            'selling_price'   => $p->selling_price,
            'reorder_level'   => $p->reorder_level,
            'expiration_date' => $p->expiration_date,
            'status'          => $p->status ?? 'Active',
            'stock'           => $p->inventory?->current_stock ?? 0,
            'stock_status'    => $p->inventory?->stock_status ?? 'Normal',
        ]);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $data    = $request->validate([
            'category_id'     => 'sometimes|integer|exists:Category,Category_id',
            'supplier_id'     => 'sometimes|integer|exists:Supplier,supplier_id',
            'barcode'         => 'nullable|string|max:50|unique:Product,barcode,' . $id . ',product_id',
            'product_name'    => 'sometimes|string|max:150',
            'cost_price'      => 'sometimes|numeric|min:0',
            'selling_price'   => 'sometimes|numeric|min:0',
            'reorder_level'   => 'sometimes|integer|min:0',
            'expiration_date' => 'nullable|date',
            'status'          => 'sometimes|in:Active,Discontinued',
        ]);
        $product->update($data);
        return response()->json(['message' => 'Product updated.']);
    }

    public function destroy($id)
    {
        // Soft archive/discontinue product to preserve historical audit trail & ML data integrity
        $product = Product::findOrFail($id);
        $newStatus = $product->status === 'Discontinued' ? 'Active' : 'Discontinued';
        $product->update(['status' => $newStatus]);

        return response()->json([
            'message' => $newStatus === 'Discontinued' ? 'Product discontinued/archived.' : 'Product re-activated.',
            'status'  => $newStatus,
        ]);
    }
}
