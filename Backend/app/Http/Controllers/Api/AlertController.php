<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FEFOBatch;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AlertController extends Controller
{
    protected function scopeForBusinessAndBranch($query, Request $request)
    {
        $user = $request->user();
        if ($user && $user->business_id) {
            $query->where('business_id', $user->business_id);
        }
        if ($user && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        return $query;
    }

    public function expiring(Request $request)
    {
        $days = (int) $request->input('days', 30);
        $type = $request->input('type', 'all'); // 'fefo', 'supplier', 'all'

        $response = [];

        if ($type === 'fefo' || $type === 'all') {
            $query = FEFOBatch::where('status', 'active')
                ->where('expiry_date', '>=', now())
                ->where('expiry_date', '<=', now()->addDays($days));
            $query = $this->scopeForBusinessAndBranch($query, $request);

            $batches = $query->with('product.category')
                ->orderBy('expiry_date')
                ->get()
                ->map(fn ($b) => [
                    'type' => 'batch_expiry',
                    'id' => $b->batch_id,
                    'product_id' => $b->product_id,
                    'product_name' => $b->product?->product_name,
                    'sku' => $b->product?->barcode,
                    'batch_number' => $b->batch_number,
                    'quantity' => $b->quantity,
                    'expiry_date' => $b->expiry_date,
                    'days_left' => now()->diffInDays(Carbon::parse($b->expiry_date), false),
                    'severity' => $this->getSeverity($b->expiry_date),
                    'business_id' => $b->business_id,
                    'branch_id' => $b->branch_id,
                ]);

            $response['fefo_batches'] = $batches;
            $response['fefo_count'] = $batches->count();
        }

        if ($type === 'supplier' || $type === 'all') {
            $query = Supplier::query();
            $query = $this->scopeForBusinessAndBranch($query, $request);

            $expiring = $query->where(function ($q) use ($days) {
                $q->where('fda_lto_expiry', '<=', now()->addDays($days))
                    ->where('fda_lto_expiry', '>=', now())
                    ->orWhere('fda_cpr_expiry', '<=', now()->addDays($days))
                    ->where('fda_cpr_expiry', '>=', now());
            })->get()->map(fn ($s) => [
                'type' => 'supplier_license',
                'id' => $s->supplier_id,
                'name' => $s->supplier_name,
                'fda_lto_number' => $s->fda_lto_number,
                'fda_lto_expiry' => $s->fda_lto_expiry,
                'fda_cpr_number' => $s->fda_cpr_number,
                'fda_cpr_expiry' => $s->fda_cpr_expiry,
                'lto_days_remaining' => $s->fda_lto_expiry ? Carbon::parse($s->fda_lto_expiry)->diffInDays(now(), false) : null,
                'cpr_days_remaining' => $s->fda_cpr_expiry ? Carbon::parse($s->fda_cpr_expiry)->diffInDays(now(), false) : null,
                'severity' => $this->getSupplierSeverity($s->fda_lto_expiry, $s->fda_cpr_expiry),
            ]);

            $response['supplier_licenses'] = $expiring;
            $response['supplier_count'] = $expiring->count();
        }

        return response()->json($response);
    }

    public function summary(Request $request)
    {
        $query = FEFOBatch::where('status', 'active');
        $query = $this->scopeForBusinessAndBranch($query, $request);

        $now = now();
        $thresholds = [7, 14, 30];

        $batchSummary = [];
        foreach ($thresholds as $days) {
            $batchSummary[$days] = (clone $query)
                ->where('expiry_date', '>=', $now)
                ->where('expiry_date', '<=', $now->addDays($days))
                ->count();
        }

        $querySupplier = Supplier::query();
        $querySupplier = $this->scopeForBusinessAndBranch($querySupplier, $request);

        $supplierSummary = [];
        foreach ($thresholds as $days) {
            $supplierSummary[$days] = (clone $querySupplier)
                ->where(function ($q) use ($now, $days) {
                    $q->where('fda_lto_expiry', '<=', $now->copy()->addDays($days))
                        ->where('fda_lto_expiry', '>=', $now)
                        ->orWhere('fda_cpr_expiry', '<=', $now->copy()->addDays($days))
                        ->where('fda_cpr_expiry', '>=', $now);
                })
                ->count();
        }

        return response()->json([
            'fefo_batches' => $batchSummary,
            'supplier_licenses' => $supplierSummary,
            'total_critical' => $batchSummary[7] + $supplierSummary[7],
            'total_expiring_14' => $batchSummary[14] + $supplierSummary[14],
            'total_expiring_30' => $batchSummary[30] + $supplierSummary[30],
        ]);
    }

    private function getSeverity(string $expiryDate): string
    {
        $days = Carbon::parse($expiryDate)->diffInDays(now(), false);
        if ($days <= 3) return 'critical';
        if ($days <= 7) return 'high';
        if ($days <= 14) return 'medium';
        return 'low';
    }

    private function getSupplierSeverity(?string $ltoExpiry, ?string $cprExpiry): string
    {
        $severity = 'low';
        
        if ($ltoExpiry) {
            $days = Carbon::parse($ltoExpiry)->diffInDays(now(), false);
            if ($days <= 3) return 'critical';
            if ($days <= 7) $severity = 'high';
            else if ($days <= 14 && $severity !== 'high') $severity = 'medium';
        }
        
        if ($cprExpiry) {
            $days = Carbon::parse($cprExpiry)->diffInDays(now(), false);
            if ($days <= 3) return 'critical';
            if ($days <= 7 && $severity !== 'critical') $severity = 'high';
            else if ($days <= 14 && $severity !== 'high' && $severity !== 'critical') $severity = 'medium';
        }

        return $severity;
    }
}