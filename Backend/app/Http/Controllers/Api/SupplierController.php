<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

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
        return response()->json(['message' => 'Supplier created.', 'id' => $supplier->supplier_id], 201);
    }

    public function show($id)
    {
        $s = Supplier::withCount('products')->findOrFail($id);
        return response()->json([
            'id'             => $s->supplier_id,
            'name'           => $s->supplier_name,
            'contact_person' => $s->contact_person,
            'contact_number' => $s->contact_number,
            'address'        => $s->address,
            'product_count'  => $s->products_count,
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
        return response()->json(['message' => 'Supplier updated.']);
    }

    public function destroy($id)
    {
        Supplier::findOrFail($id)->delete();
        return response()->json(['message' => 'Supplier deleted.']);
    }
}
