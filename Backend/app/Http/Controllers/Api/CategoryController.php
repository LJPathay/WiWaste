<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\CreateCategoryRequest;
use App\Http\Requests\Api\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\AuditLog;
use App\Models\Category;

class CategoryController extends BaseApiController
{
    private function present(Category $c): array
    {
        return (new CategoryResource($c))->resolve(request());
    }

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

        // Mirrors the users endpoint: the default list is everything still in use, and
        // a tab can ask for one status or exclude one.
        //
        // An archived category is deliberately not offered by default. Its only two
        // consumers â€” `useCategories()` and the product form's category picker â€” exist
        // to choose a category to file something *under*, and a retired category is not
        // a valid choice. Manage Categories asks for each status explicitly, so it still
        // sees the full set.
        if ($exclude = request()->get('exclude_status')) {
            $query->where('status', '!=', $exclude);
        } elseif (! request()->has('status')) {
            $query->where('status', '!=', 'Archived');
        }

        if (request()->has('status')) {
            $query->where('status', request()->get('status'));
        }

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        return $this->paginated($paginated->through(fn ($c) => $this->present($c)));
    }

    public function store(CreateCategoryRequest $request)
    {
        $cat = Category::create($request->validated() + ['status' => 'Active']);

        return $this->created($this->present($cat));
    }

    public function show($id)
    {
        $c = Category::withCount('products')->findOrFail($id);

        return $this->success($this->present($c));
    }

    public function update(UpdateCategoryRequest $request, $id)
    {
        $cat = Category::withCount('products')->findOrFail($id);
        $cat->update($request->validated());

        return $this->success($this->present($cat));
    }

    /**
     * Archives a category instead of removing it, and restores it when called again on
     * an already-archived row â€” the same toggle ProductController::destroy() uses.
     *
     * The row is retained so historical products, sales and wastage records keep
     * resolving their category instead of pointing at a missing id.
     */
    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        $oldStatus = $category->status;
        $newStatus = $oldStatus === 'Archived' ? 'Active' : 'Archived';
        $category->update(['status' => $newStatus]);

        AuditLog::create([
            'user_id' => request()->user()?->User_id ?? null,
            'action' => "Category \"{$category->Category_name}\" {$newStatus}",
            'entity_type' => 'Category',
            'entity_id' => $category->Category_id,
            'old_values' => json_encode(['status' => $oldStatus]),
            'new_values' => json_encode(['status' => $newStatus]),
            'created_at' => now(),
            'business_id' => request()->user()?->business_id,
            'branch_id' => request()->user()?->branch_id,
        ]);

        return $this->success(
            $this->present($category->fresh()),
            $newStatus === 'Archived' ? 'Category archived.' : 'Category restored.'
        );
    }
}
