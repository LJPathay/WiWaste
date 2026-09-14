<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    protected function scopeForBusinessAndBranch($query, Request $request)
    {
        $user = $request->user();
        if ($user && $user->business_id) {
            $query->where('business_id', $user->business_id);
        }
        if ($user && $user->branch_id) {
            $query->whereHas('inventory', function ($q) use ($user) {
                $q->where('branch_id', $user->branch_id);
            });
        }
        return $query;
    }

    public function index(Request $request)
    {
        $query = Product::with(['category', 'supplier', 'inventory']);

        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($classification = $request->input('product_classification')) {
            $query->where('product_classification', $classification);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->paginate($perPage)->through(fn ($p) => [
                'id'                     => $p->product_id,
                'name'                   => $p->product_name,
                'sku'                    => $p->barcode,
                'category_id'            => $p->category_id,
                'category'               => $p->category?->Category_name,
                'supplier_id'            => $p->supplier_id,
                'supplier'               => $p->supplier?->supplier_name,
                'cost_price'             => $p->cost_price,
                'selling_price'          => $p->selling_price,
                'reorder_level'          => $p->reorder_level,
                'expiration_date'        => $p->expiration_date,
                'status'                 => $p->status ?? 'Active',
                'stock'                  => $p->inventory?->current_stock ?? 0,
                'stock_status'           => $p->inventory?->stock_status ?? 'Normal',
                'business_id'            => $p->business_id,
                'product_classification' => $p->product_classification,
                'required_temp_min'      => $p->required_temp_min,
                'required_temp_max'      => $p->required_temp_max,
                'storage_requirement'    => $p->storage_requirement,
                'is_rx_only'             => $p->is_rx_only,
                'ddb_schedule'           => $p->ddb_schedule,
            ])
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'business_id'             => 'sometimes|integer|exists:businesses,id',
            'category_id'             => 'required|integer|exists:Category,Category_id',
            'supplier_id'             => 'required|integer|exists:Supplier,supplier_id',
            'barcode'                 => 'nullable|string|max:50|unique:Product,barcode',
            'product_name'            => 'required|string|max:150',
            'cost_price'              => 'required|numeric|min:0',
            'selling_price'           => 'required|numeric|min:0',
            'reorder_level'           => 'required|integer|min:0',
            'expiration_date'         => 'nullable|date',
            'status'                  => 'nullable|in:Active,Discontinued',
            'initial_stock'           => 'nullable|integer|min:0',
            'product_classification'  => 'nullable|in:food,drug,cosmetic,device,general',
            'required_temp_min'       => 'nullable|numeric',
            'required_temp_max'       => 'nullable|numeric',
            'storage_requirement'     => 'nullable|in:refrigerated,frozen,controlled_room,ambient,custom',
            'is_rx_only'              => 'nullable|boolean',
            'ddb_schedule'            => 'nullable|string|max:20',
        ]);

        // Auto-assign business_id from user if not provided
        if (!isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }

        $initialStock = $data['initial_stock'] ?? 0;
        unset($data['initial_stock']);

        $product = Product::create($data);

        // Auto-create inventory record
        $stockStatus = $initialStock <= 0 ? 'Low Stock' : ($initialStock > 100 ? 'Overstock' : 'Normal');
        $inventoryData = [
            'product_id'   => $product->product_id,
            'current_stock' => $initialStock,
            'stock_status' => $stockStatus,
            'last_updated' => now(),
        ];

        if ($user && $user->business_id) {
            $inventoryData['business_id'] = $user->business_id;
        }
        if ($user && $user->branch_id) {
            $inventoryData['branch_id'] = $user->branch_id;
        }

        Inventory::create($inventoryData);

        AuditLog::create([
            'user_id'       => $user?->User_id ?? 1,
            'action'        => "Created product \"{$product->product_name}\"",
            'entity_type'   => 'Product',
            'entity_id'     => $product->product_id,
            'old_values'    => null,
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $user?->business_id,
            'branch_id'     => $user?->branch_id,
        ]);

        $product->load(['category', 'supplier', 'inventory']);

        return response()->json([
            'id'                     => $product->product_id,
            'name'                   => $product->product_name,
            'sku'                    => $product->barcode,
            'category_id'            => $product->category_id,
            'category'               => $product->category?->Category_name,
            'supplier_id'            => $product->supplier_id,
            'supplier'               => $product->supplier?->supplier_name,
            'cost_price'             => $product->cost_price,
            'selling_price'          => $product->selling_price,
            'reorder_level'          => $product->reorder_level,
            'expiration_date'        => $product->expiration_date,
            'status'                 => $product->status ?? 'Active',
            'stock'                  => $product->inventory?->current_stock ?? 0,
            'stock_status'           => $product->inventory?->stock_status ?? 'Normal',
            'business_id'            => $product->business_id,
            'product_classification' => $product->product_classification,
            'required_temp_min'      => $product->required_temp_min,
            'required_temp_max'      => $product->required_temp_max,
            'storage_requirement'    => $product->storage_requirement,
            'is_rx_only'             => $product->is_rx_only,
            'ddb_schedule'           => $product->ddb_schedule,
        ], 201);
    }

    public function show($id)
    {
        $query = Product::with(['category', 'supplier', 'inventory']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $p = $query->findOrFail($id);

        return response()->json([
            'id'                     => $p->product_id,
            'name'                   => $p->product_name,
            'sku'                    => $p->barcode,
            'category_id'            => $p->category_id,
            'category'               => $p->category?->Category_name,
            'supplier_id'            => $p->supplier_id,
            'supplier'               => $p->supplier?->supplier_name,
            'cost_price'             => $p->cost_price,
            'selling_price'          => $p->selling_price,
            'reorder_level'          => $p->reorder_level,
            'expiration_date'        => $p->expiration_date,
            'status'                 => $p->status ?? 'Active',
            'stock'                  => $p->inventory?->current_stock ?? 0,
            'stock_status'           => $p->inventory?->stock_status ?? 'Normal',
            'business_id'            => $p->business_id,
            'product_classification' => $p->product_classification,
            'required_temp_min'      => $p->required_temp_min,
            'required_temp_max'      => $p->required_temp_max,
            'storage_requirement'    => $p->storage_requirement,
            'is_rx_only'             => $p->is_rx_only,
            'ddb_schedule'           => $p->ddb_schedule,
        ]);
    }

    public function update(Request $request, $id)
    {
        $query = Product::with(['category', 'supplier', 'inventory']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $product = $query->findOrFail($id);

        $data = $request->validate([
            'category_id'             => 'sometimes|integer|exists:Category,Category_id',
            'supplier_id'             => 'sometimes|integer|exists:Supplier,supplier_id',
            'barcode'                 => 'nullable|string|max:50|unique:Product,barcode,' . $id . ',product_id',
            'product_name'            => 'sometimes|string|max:150',
            'cost_price'              => 'sometimes|numeric|min:0',
            'selling_price'           => 'sometimes|numeric|min:0',
            'reorder_level'           => 'sometimes|integer|min:0',
            'expiration_date'         => 'nullable|date',
            'status'                  => 'sometimes|in:Active,Discontinued',
            'product_classification'  => 'nullable|in:food,drug,cosmetic,device,general',
            'required_temp_min'       => 'nullable|numeric',
            'required_temp_max'       => 'nullable|numeric',
            'storage_requirement'     => 'nullable|in:refrigerated,frozen,controlled_room,ambient,custom',
            'is_rx_only'              => 'nullable|boolean',
            'ddb_schedule'            => 'nullable|string|max:20',
        ]);

        $oldValues = $product->getOriginal();
        $product->update($data);

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Updated product \"{$product->product_name}\"",
            'entity_type'   => 'Product',
            'entity_id'     => $product->product_id,
            'old_values'    => json_encode($oldValues),
            'new_values'    => json_encode($data),
            'created_at'    => now(),
            'business_id'   => $request->user()?->business_id,
            'branch_id'     => $request->user()?->branch_id,
        ]);

        return response()->json(['message' => 'Product updated.']);
    }

    public function destroy(Request $request, $id)
    {
        $query = Product::with(['category', 'supplier', 'inventory']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $product = $query->findOrFail($id);

        $newStatus = $product->status === 'Discontinued' ? 'Active' : 'Discontinued';
        $product->update(['status' => $newStatus]);

        AuditLog::create([
            'user_id'       => $request->user()?->User_id ?? 1,
            'action'        => "Product \"{$product->product_name}\" {$newStatus}",
            'entity_type'   => 'Product',
            'entity_id'     => $product->product_id,
            'old_values'    => json_encode(['status' => $product->getOriginal()['status'] ?? 'Active']),
            'new_values'    => json_encode(['status' => $newStatus]),
            'created_at'    => now(),
            'business_id'   => $request->user()?->business_id,
            'branch_id'     => $request->user()?->branch_id,
        ]);

        return response()->json([
            'message' => $newStatus === 'Discontinued' ? 'Product discontinued/archived.' : 'Product re-activated.',
            'status'  => $newStatus,
        ]);
    }

    public function lookup($code)
    {
        $query = Product::with(['category', 'supplier', 'inventory']);
        $query = $this->scopeForBusinessAndBranch($query, request());

        $product = $query->where('barcode', $code)->first();

        if (!$product && is_numeric($code) && strlen($code) <= 6) {
            $product = $query->find((int) $code);
        }

        if (!$product) {
            return response()->json(['message' => 'Product not found.'], 404);
        }

        return response()->json([
            'id'                     => $product->product_id,
            'name'                   => $product->product_name,
            'sku'                    => $product->barcode,
            'plu_code'               => (string) $product->product_id,
            'category_id'            => $product->category_id,
            'category'               => $product->category?->Category_name,
            'supplier_id'            => $product->supplier_id,
            'supplier'               => $product->supplier?->supplier_name,
            'cost_price'             => $product->cost_price,
            'selling_price'          => $product->selling_price,
            'reorder_level'          => $product->reorder_level,
            'expiration_date'        => $product->expiration_date,
            'status'                 => $product->status ?? 'Active',
            'stock'                  => $product->inventory?->current_stock ?? 0,
            'stock_status'           => $product->inventory?->stock_status ?? 'Normal',
            'business_id'            => $product->business_id,
            'product_classification' => $product->product_classification,
            'required_temp_min'      => $product->required_temp_min,
            'required_temp_max'      => $product->required_temp_max,
            'storage_requirement'    => $product->storage_requirement,
            'is_rx_only'             => $product->is_rx_only,
            'ddb_schedule'           => $product->ddb_schedule,
        ]);
    }
}