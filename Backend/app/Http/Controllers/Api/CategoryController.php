<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    private function authorizeManagement(Request $request): void
    {
        abort_unless($request->user()?->canManageUsers() || $request->user()?->role === 'Inventory', 403, 'You cannot manage categories.');
    }

    public function index(Request $request)
    {
        $request->validate(['status' => ['sometimes', Rule::in(['Active', 'Archived'])]]);
        $categories = Cache::rememberForever(Category::CACHE_KEY, fn () => Category::withCount('products')->orderBy('Category_id')->get());
        if ($request->filled('status')) {
            $categories = $categories->where('status', $request->input('status'));
        } elseif (! $request->boolean('include_archived')) {
            $categories = $categories->where('status', 'Active');
        }
        if ($request->filled('search')) {
            $needle = mb_strtolower($request->input('search'));
            $categories = $categories->filter(fn ($category) => str_contains(mb_strtolower($category->Category_name), $needle));
        }
        if ($request->filled('exclude_status')) {
            $categories = $categories->where('status', '!=', $request->input('exclude_status'));
        }
        $rows = $categories->values()->map(fn ($category) => [
            'id' => $category->Category_id, 'name' => $category->Category_name,
            'product_count' => $category->products_count, 'status' => $category->status,
            'archived_at' => $category->archived_at, 'archived_by' => $category->archived_by,
        ]);
        if ($request->is('api/v1/*')) {
            return response()->json(['data' => $rows, 'meta' => ['total' => $rows->count()], 'success' => true]);
        }

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $this->authorizeManagement($request);
        $data = $request->validate([
            'Category_name' => 'required|string|max:100|unique:Category,Category_name',
        ]);
        $cat = Category::create($data);

        return response()->json([
            'id' => $cat->Category_id,
            'name' => $cat->Category_name,
            'product_count' => 0,
            'status' => 'Active',
            'archived_at' => null,
            'archived_by' => null,
        ], 201);
    }

    public function show($id)
    {
        $c = Category::withCount('products')->findOrFail($id);

        return response()->json(['id' => $c->Category_id, 'name' => $c->Category_name, 'product_count' => $c->products_count, 'status' => $c->status, 'archived_at' => $c->archived_at, 'archived_by' => $c->archived_by]);
    }

    public function update(Request $request, $id)
    {
        $this->authorizeManagement($request);
        $cat = Category::findOrFail($id);
        $data = $request->validate([
            'Category_name' => 'required|string|max:100|unique:Category,Category_name,'.$id.',Category_id',
        ]);
        $cat->update($data);

        return response()->json([
            'id' => $cat->Category_id,
            'name' => $cat->Category_name,
            'product_count' => $cat->products()->count(),
            'status' => $cat->status,
            'archived_at' => $cat->archived_at,
            'archived_by' => $cat->archived_by,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        return $this->changeArchiveStatus($request, $id, true);
    }

    public function restore(Request $request, $id)
    {
        return $this->changeArchiveStatus($request, $id, false);
    }

    private function changeArchiveStatus(Request $request, $id, bool $archive)
    {
        $this->authorizeManagement($request);
        $category = Category::findOrFail($id);
        $status = $archive ? 'Archived' : 'Active';
        if ($category->status !== $status) {
            DB::transaction(function () use ($request, $category, $status, $archive) {
                $old = ['status' => $category->status];
                $category->update([
                    'status' => $status,
                    'archived_at' => $archive ? now() : null,
                    'archived_by' => $archive ? $request->user()->User_id : null,
                ]);
                AuditLog::create([
                    'user_id' => $request->user()->User_id,
                    'action' => $archive ? 'Archived category' : 'Restored category',
                    'entity_type' => 'Category',
                    'entity_id' => $category->Category_id,
                    'old_values' => json_encode($old),
                    'new_values' => json_encode(['status' => $status]),
                    'created_at' => now(),
                    'business_id' => $request->user()->business_id,
                    'branch_id' => $request->user()->branch_id,
                ]);
            });
        }

        return response()->json(['message' => $archive ? 'Category archived.' : 'Category restored.', 'status' => $status]);
    }
}
