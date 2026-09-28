<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) $request->get('per_page', 15), 100);
        $page = (int) $request->get('page', 1);

        $query = Category::withCount('products');

        // Allow filtering
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('Category_name', 'like', "%{$search}%");
            });
        }

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginated->items()->map(fn ($c) => [
                'id'            => $c->Category_id,
                'name'          => $c->Category_name,
                'product_count' => $c->products_count,
            ]),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'Category_name' => 'required|string|max:100|unique:Category,Category_name',
        ]);
        $cat = Category::create($data);
        return response()->json([
            'id'            => $cat->Category_id,
            'name'          => $cat->Category_name,
            'product_count' => 0,
        ], 201);
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
        return response()->json([
            'id'            => $cat->Category_id,
            'name'          => $cat->Category_name,
            'product_count' => $cat->products()->count(),
        ]);
    }

    public function destroy($id)
    {
        Category::findOrFail($id)->delete();
        return response()->json(['message' => 'Category deleted.']);
    }
}
