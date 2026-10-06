<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Api\CreateProductRequest;
use App\Http\Requests\Api\UpdateProductRequest;
use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Inventory;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Picqer\Barcode\BarcodeGeneratorPNG;
use Picqer\Barcode\BarcodeGeneratorSVG;

class ProductController extends Controller
{
    use ScopesTenant;

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

        // `->through()` keeps Laravel's flat paginator envelope (data/current_page/
        // total as siblings). `ProductResource::collection()` would switch the shape
        // to {data, links, meta}, which the frontend's PaginatedResponse type does
        // not describe.
        return response()->json(
            $query->paginate($perPage)->through(fn ($p) => (new ProductResource($p))->resolve($request))
        );
    }

    public function store(CreateProductRequest $request)
    {
        $user = $request->user();

        $data = $request->validated();

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

        return response()->json((new ProductResource($product))->resolve($request), 201);
    }

    public function show($id)
    {
        $query = Product::with(['category', 'supplier', 'inventory']);
        $query = $this->scopeForBusinessAndBranch($query, request());
        $p = $query->findOrFail($id);

        return response()->json((new ProductResource($p))->resolve(request()));
    }

    public function update(UpdateProductRequest $request, $id)
    {
        $query = Product::with(['category', 'supplier', 'inventory']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $product = $query->findOrFail($id);

        $data = $request->validated();

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

        return response()->json((new ProductResource($product))->resolve(request()));
    }

    public function label(Request $request, $id)
    {
        $query = Product::where('product_id', $id);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $product = $query->firstOrFail();

        $barcode = $product->barcode ?? (string) $product->product_id;
        $format = $request->query('format', 'png');

        if ($format === 'svg') {
            $generator = new BarcodeGeneratorSVG();
            $barcodeImage = $generator->getBarcode($barcode, $generator::TYPE_CODE_128, 2, 50);
            return response($barcodeImage)
                ->header('Content-Type', 'image/svg+xml')
                ->header('Content-Disposition', 'inline; filename="label-' . $barcode . '.svg"');
        }

        $generator = new BarcodeGeneratorPNG();
        $barcodeImage = $generator->getBarcode($barcode, $generator::TYPE_CODE_128, 2, 50);

        return response($barcodeImage)
            ->header('Content-Type', 'image/png')
            ->header('Content-Disposition', 'inline; filename="label-' . $barcode . '.png"');
    }
}
