<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(
            Category::withCount('products')->get()->map(fn ($c) => [
                'id'            => $c->Category_id,
                'name'          => $c->Category_name,
                'product_count' => $c->products_count,
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'Category_name' => 'required|string|max:100|unique:Category,Category_name',
        ]);
        $cat = Category::create($data);
        return response()->json(['message' => 'Category created.', 'id' => $cat->Category_id], 201);
    }

    public function show($id)
    {
        $c = Category::withCount('products')->findOrFail($id);
        return response()->json(['id' => $c->Category_id, 'name' => $c->Category_name, 'product_count' => $c->products_count]);
    }

    public function update(Request $request, $id)
    {
        $cat  = Category::findOrFail($id);
        $data = $request->validate([
            'Category_name' => 'required|string|max:100|unique:Category,Category_name,' . $id . ',Category_id',
        ]);
        $cat->update($data);
        return response()->json(['message' => 'Category updated.']);
    }

    public function destroy($id)
    {
        Category::findOrFail($id)->delete();
        return response()->json(['message' => 'Category deleted.']);
    }
}
