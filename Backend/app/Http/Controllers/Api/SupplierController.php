<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ScopesTenant;
use App\Http\Requests\Api\CreateSupplierRequest;
use App\Http\Requests\Api\UpdateSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends BaseApiController
{
    use ScopesTenant;

    public function index()
    {
        $perPage = min((int) request()->get('per_page', 15), 100);
        $page = (int) request()->get('page', 1);

        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, request());

        if (request()->has('search')) {
            $search = request()->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('supplier_name', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $paginated = $query->paginate(min((int) request()->get('per_page', 15), 100), ['*'], 'page', (int) request()->get('page', 1));

        return $this->paginated($paginated->through(fn ($s) => (new SupplierResource($s))->resolve(request())));
    }

    public function store(CreateSupplierRequest $request)
    {
        $user = request()->user();

        $data = $request->validated();

        // Auto-assign business_id from user if not provided
        if (! isset($data['business_id']) && $user && $user->business_id) {
            $data['business_id'] = $user->business_id;
        }

        $supplier = Supplier::create($data);

        return $this->created([
            'id' => $supplier->supplier_id,
            'name' => $supplier->supplier_name,
            'contact_person' => $supplier->contact_person,
            'contact_number' => $supplier->contact_number,
            'email' => $supplier->email,
            'address' => $supplier->address,
            'product_count' => 0,
            'business_id' => $supplier->business_id,
            'fda_lto_number' => $supplier->fda_lto_number,
            'fda_lto_expiry' => $supplier->fda_lto_expiry,
            'fda_cpr_number' => $supplier->fda_cpr_number,
            'fda_cpr_expiry' => $supplier->fda_cpr_expiry,
        ]);
    }

    public function show($id)
    {
        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, request());
        $s = $query->findOrFail($id);

        $lowStockCount = DB::table('Inventory as i')
            ->join('Product as p', 'i.product_id', '=', 'p.product_id')
            ->where('p.supplier_id', $id)
            ->where('i.stock_status', 'Low Stock')
            ->count();

        $totalProducts = $s->products_count;

        $recentProducts = $s->products()
            ->join('Inventory as i', 'Product.product_id', '=', 'i.product_id')
            ->select('Product.product_id', 'Product.product_name', 'i.current_stock', 'i.stock_status')
            ->limit(5)
            ->get();

        return $this->success([
            'id' => $s->supplier_id,
            'name' => $s->supplier_name,
            'contact_person' => $s->contact_person,
            'contact_number' => $s->contact_number,
            'email' => $s->email,
            'address' => $s->address,
            'product_count' => $totalProducts,
            'low_stock_count' => $lowStockCount,
            'recent_products' => $recentProducts,
            'business_id' => $s->business_id,
            'fda_lto_number' => $s->fda_lto_number,
            'fda_lto_expiry' => $s->fda_lto_expiry,
            'fda_cpr_number' => $s->fda_cpr_number,
            'fda_cpr_expiry' => $s->fda_cpr_expiry,
        ]);
    }

    public function update(UpdateSupplierRequest $request, $id)
    {
        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, request());
        $supplier = $query->findOrFail($id);

        $supplier->update($request->validated());

        return $this->success([
            'id' => $supplier->supplier_id,
            'name' => $supplier->supplier_name,
            'contact_person' => $supplier->contact_person,
            'contact_number' => $supplier->contact_number,
            'email' => $supplier->email,
            'address' => $supplier->address,
            'product_count' => $supplier->products()->count(),
            'business_id' => $supplier->business_id,
            'fda_lto_number' => $supplier->fda_lto_number,
            'fda_lto_expiry' => $supplier->fda_lto_expiry,
            'fda_cpr_number' => $supplier->fda_cpr_number,
            'fda_cpr_expiry' => $supplier->fda_cpr_expiry,
        ]);
    }

    public function destroy($id)
    {
        $query = Supplier::withCount('products');
        $query = $this->scopeForBusiness($query, request());
        $query->findOrFail($id)->delete();

        return $this->noContent('Supplier deleted.');
    }

    public function compliance()
    {
        $query = Supplier::query();
        $query = $this->scopeForBusiness($query, request());

        $suppliers = $query->get()->map(fn ($s) => [
            'id' => $s->supplier_id,
            'name' => $s->supplier_name,
            'fda_lto_number' => $s->fda_lto_number,
            'fda_lto_expiry' => $s->fda_lto_expiry,
            'fda_cpr_number' => $s->fda_cpr_number,
            'fda_cpr_expiry' => $s->fda_cpr_expiry,
            'lto_status' => $this->getLicenseStatus($s->fda_lto_expiry),
            'cpr_status' => $this->getLicenseStatus($s->fda_cpr_expiry),
            'days_until_lto_expiry' => $s->fda_lto_expiry ? Carbon::parse($s->fda_lto_expiry)->diffInDays(now(), false) : null,
            'days_until_cpr_expiry' => $s->fda_cpr_expiry ? Carbon::parse($s->fda_cpr_expiry)->diffInDays(now(), false) : null,
        ]);

        return $this->success([
            'suppliers' => $suppliers,
            'summary' => [
                'total' => $suppliers->count(),
                'lto_expiring_30' => $suppliers->filter(fn ($s) => $s['days_until_lto_expiry'] !== null && $s['days_until_lto_expiry'] <= 30 && $s['days_until_lto_expiry'] >= 0)->count(),
                'lto_expiring_14' => $suppliers->filter(fn ($s) => $s['days_until_lto_expiry'] !== null && $s['days_until_lto_expiry'] <= 14 && $s['days_until_lto_expiry'] >= 0)->count(),
                'lto_expiring_7' => $suppliers->filter(fn ($s) => $s['days_until_lto_expiry'] !== null && $s['days_until_lto_expiry'] <= 7 && $s['days_until_lto_expiry'] >= 0)->count(),
                'lto_expired' => $suppliers->filter(fn ($s) => $s['days_until_lto_expiry'] !== null && $s['days_until_lto_expiry'] < 0)->count(),
                'cpr_expiring_30' => $suppliers->filter(fn ($s) => $s['days_until_cpr_expiry'] !== null && $s['days_until_cpr_expiry'] <= 30 && $s['days_until_cpr_expiry'] >= 0)->count(),
                'cpr_expiring_14' => $suppliers->filter(fn ($s) => $s['days_until_cpr_expiry'] !== null && $s['days_until_cpr_expiry'] <= 14 && $s['days_until_cpr_expiry'] >= 0)->count(),
                'cpr_expiring_7' => $suppliers->filter(fn ($s) => $s['days_until_cpr_expiry'] !== null && $s['days_until_cpr_expiry'] <= 7 && $s['days_until_cpr_expiry'] >= 0)->count(),
                'cpr_expired' => $suppliers->filter(fn ($s) => $s['days_until_cpr_expiry'] !== null && $s['days_until_cpr_expiry'] < 0)->count(),
            ],
        ]);
    }

    public function alerts(Request $request)
    {
        $days = (int) request()->input('days', 30);

        $query = Supplier::query();
        $query = $this->scopeForBusiness($query, request());

        $expiring = $query->where(function ($q) use ($days) {
            $q->where('fda_lto_expiry', '<=', now()->addDays($days))
                ->where('fda_lto_expiry', '>=', now())
                ->orWhere('fda_cpr_expiry', '<=', now()->addDays($days))
                ->where('fda_cpr_expiry', '>=', now());
        })->get()->map(fn ($s) => [
            'id' => $s->supplier_id,
            'name' => $s->supplier_name,
            'fda_lto_number' => $s->fda_lto_number,
            'fda_lto_expiry' => $s->fda_lto_expiry,
            'fda_cpr_number' => $s->fda_cpr_number,
            'fda_cpr_expiry' => $s->fda_cpr_expiry,
            'lto_days_remaining' => $s->fda_lto_expiry ? Carbon::parse($s->fda_lto_expiry)->diffInDays(now(), false) : null,
            'cpr_days_remaining' => $s->fda_cpr_expiry ? Carbon::parse($s->fda_cpr_expiry)->diffInDays(now(), false) : null,
        ]);

        return $this->success([
            'alerts' => $expiring,
            'count' => $expiring->count(),
        ]);
    }

    private function getLicenseStatus(?string $expiryDate): string
    {
        if (! $expiryDate) {
            return 'not_provided';
        }
        $days = Carbon::parse($expiryDate)->diffInDays(now(), false);
        if ($days < 0) {
            return 'expired';
        }
        if ($days <= 7) {
            return 'critical';
        }
        if ($days <= 14) {
            return 'expiring_soon';
        }
        if ($days <= 30) {
            return 'expiring';
        }

        return 'valid';
    }
}
