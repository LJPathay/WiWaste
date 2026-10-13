<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\CreateCategoryRequest;
use App\Http\Requests\Api\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\AuditLog;
use App\Models\Category;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class CategoryController extends BaseApiController
{
    private function present(Category $c): array
    {
        return (new CategoryResource($c))->resolve(request());
    }

    public function index()
    {
        $perPage = max(1, min((int) request()->get('per_page', 15), 100));
        $page = max(1, (int) request()->get('page', 1));

        // Phase 19: the list is reference data — a few dozen rows that every product
        // form, picker and dashboard reads — so it is fetched once and kept forever.
        // Searching, status filtering and paging all happen in memory afterwards,
        // which turns what used to be a query per keystroke into a cache hit. The key
        // is dropped by Category::booted() / Product::boot() on any write, so this
        // cannot outlive the data it describes.
        $categories = Cache::rememberForever(Category::CACHE_KEY, function () {
            return Category::withCount('products')->orderBy('Category_id')->get();
        });

        $filtered = $categories;

        if (request()->has('search')) {
            // `like %x%` on MySQL is case-insensitive for the default collation, so the
            // in-memory match lowercases both sides to keep the same results.
            $search = strtolower((string) request()->get('search'));
            $filtered = $filtered->filter(
                fn ($c) => str_contains(strtolower((string) $c->Category_name), $search)
            );
        }

        // Mirrors the users endpoint: the default list is everything still in use, and
        // a tab can ask for one status or exclude one.
        //
        // An archived category is deliberately not offered by default. Its only two
        // consumers — `useCategories()` and the product form's category picker — exist
        // to choose a category to file something *under*, and a retired category is not
        // a valid choice. Manage Categories asks for each status explicitly, so it still
        // sees the full set.
        if ($exclude = request()->get('exclude_status')) {
            $filtered = $filtered->filter(fn ($c) => $c->status !== $exclude);
        } elseif (! request()->has('status')) {
            $filtered = $filtered->filter(fn ($c) => $c->status !== 'Archived');
        }

        if (request()->has('status')) {
            $filtered = $filtered->filter(fn ($c) => $c->status === request()->get('status'));
        }

        // `values()` matters: a filtered collection keeps its original keys, and the
        // paginator would serialise those gaps as a JSON object instead of a list.
        $items = $filtered->values();
        $paginated = new LengthAwarePaginator(
            $items->slice(($page - 1) * $perPage, $perPage)->values(),
            $items->count(),
            $perPage,
            $page,
            ['path' => LengthAwarePaginator::resolveCurrentPath(), 'pageName' => 'page']
        );

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
