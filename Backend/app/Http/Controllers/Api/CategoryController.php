<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\CreateCategoryRequest;
use App\Http\Requests\Api\UpdateCategoryRequest;
use App\Models\Category;

class CategoryController extends BaseApiController
{
    public function index()
    {
        $perPage = min((int) request()->get('per_page', 15), 100);
        $page = (int) request()->get('page', 1);

        $query = Category::withCount('products');

        if (request()->has('search')) {
            $search = request()->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('Category_name', 'like', "%{$search}%");
            });
        }

        $paginated = $query->paginate($perPage = min((int) request()->get('per_page', 15), 100), ['*'], 'page', (int) request()->get('page', 1));

        return $this->paginated($paginated->through(fn ($c) => [
            'id'            => $c->Category_id,
            'name'          => $c->Category_name,
            'product_count' => $c->products_count,
        ]));
    }

    public function store(CreateCategoryRequest $request)
    {
        $cat = Category::create($request->validated());

        return $this->created([
            'id'            => $cat->Category_id,
            'name'          => $cat->Category_name,
            'product_count' => 0,
        ]);
    }

    public function show($id)
    {
        $c = Category::withCount('products')->findOrFail($id);
        return $this->success([
            'id'            => $c->Category_id,
            'name'          => $c->Category_name,
            'product_count' => $c->products_count,
        ]);
    }

    public function update(UpdateCategoryRequest $request, $id)
    {
        $cat = Category::findOrFail($id);
        $cat->update($request->validated());

        return $this->success([
            'id'            => $cat->Category_id,
            'name'          => $cat->Category_name,
            'product_count' => $cat->products()->count(),
        ]);
    }

    public function destroy($id)
    {
        Category::findOrFail($id)->delete();
        return $this->noContent('Category deleted.');
    }
}