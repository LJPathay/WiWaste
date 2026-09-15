<?php

namespace App\Services;

use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\Product;
use App\Models\Business;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * BIR CAS (Computerized Accounting System) Integration Pathway
 * 
 * This service provides the interface for BIR CAS integration.
 * It does NOT implement a full fiscal printer integration - it provides
 * the data pathway and document formatting required for CAS integration.
 * 
 * Per BIR requirements (RR 5-2014, RR 9-2009):
 * - VAT-registered taxpayers must use CAS
 * - Receipts must show: TIN, Business Name, Address, Serial Number, Date, VAT breakdown
 * - Sales must be transmitted to BIR (for CAS-enabled businesses)
 */
class BirIntegrationService
{
    /**
     * Generate BIR-compliant receipt data for a transaction
     * 
     * @param SalesTransaction $transaction
     * @return array BIR-compliant receipt data
     */
    public function generateReceiptData(SalesTransaction $transaction): array
    {
        $transaction->load(['user', 'branch', 'branch.business', 'salesItems.product']);
        
        $business = $transaction->branch?->business ?? $transaction->user?->business;
        $branch = $transaction->branch;
        $cashier = $transaction->user;
        
        // Calculate VAT breakdown
        $vatableSales = $transaction->salesItems
            ->where('is_senior_pwd_exempt', false)
            ->sum(function ($item) {
                return $item->vatable_amount ?? 0;
            });
        
        $nonVatableSales = $transaction->salesItems
            ->where('is_senior_pwd_exempt', true)
            ->sum(function ($item) {
                return $item->subtotal ?? 0;
            });
        
        $vatAmount = $transaction->salesItems->sum('vat_amount');
        $seniorPwdDiscount = $transaction->senior_pwd_discount_amount ?? 0;
        $seniorPwdVatExempt = $transaction->senior_pwd_vat_exempt_amount ?? 0;
        
        $items = $transaction->salesItems->map(function ($item) {
            return [
                'product_name' => $item->product?->product_name,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'vat_amount' => $item->vat_amount ?? 0,
                'vatable_amount' => $item->vatable_amount ?? 0,
                'discount_amount' => $item->discount_amount ?? 0,
                'is_senior_pwd_exempt' => $item->is_senior_pwd_exempt ?? false,
                'subtotal' => $item->subtotal,
            ];
        });

        return [
            'receipt_header' => [
                'business_name' => $business?->name ?? 'WiWaste',
                'business_tin' => $business?->tin ?? '000-000-000-000',
                'business_address' => $branch?->address ?? 'N/A',
                'branch_name' => $branch?->name ?? 'Main Branch',
                'receipt_number' => $transaction->transaction_id,
                'serial_number' => $this->generateSerialNumber($transaction),
                'date_time' => $transaction->transaction_date,
                'cashier_name' => $cashier?->Full_name ?? 'Cashier',
                'pos_serial' => $this->getPosSerial($branch),
            ],
            'customer_info' => $this->getCustomerInfo($transaction),
            'items' => $items,
            'totals' => [
                'total_sales' => $transaction->total_amount,
                'vatable_sales' => round($vatableSales, 2),
                'non_vatable_sales' => round($nonVatableSales, 2),
                'vat_amount' => round($vatAmount, 2),
                'total_discount' => round($transaction->discount_amount ?? 0, 2),
                'senior_pwd_discount' => round($seniorPwdDiscount, 2),
                'senior_pwd_vat_exempt' => round($seniorPwdVatExempt, 2),
                'total_amount' => $transaction->total_amount,
            ],
            'payment' => [
                'method' => $transaction->payment_method,
                'reference' => $transaction->payment_reference,
                'amount_tendered' => $transaction->amount_tendered,
                'change_due' => $transaction->change_due,
            ],
            'footer' => [
                'footer_message' => 'THIS SERVES AS YOUR OFFICIAL RECEIPT',
                'vat_reg_tin' => $business?->tin ?? '000-000-000-000',
                'software_version' => 'WiWaste v1.0',
                'cas_ready' => true, // Indicates CAS-ready format
            ],
        ];
    }

    /**
     * Generate BIR sales summary report (Monthly/Quarterly)
     * 
     * @param int $businessId
     * @param Carbon $fromDate
     * @param Carbon $toDate
     * @return array
     */
    public function generateSalesReport(int $businessId, Carbon $fromDate, Carbon $toDate): array
    {
        $transactions = SalesTransaction::where('business_id', $businessId)
            ->where('status', 'Completed')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->with(['salesItems', 'branch'])
            ->get();

        $totalSales = $transactions->sum('total_amount');
        $totalVat = $transactions->sum('vat_amount');
        $totalVatable = $transactions->sum('vatable_amount');
        $totalNonVatable = $transactions->sum('non_vatable_amount');
        $totalDiscount = $transactions->sum('discount_amount');
        $totalSeniorPwdDiscount = $transactions->sum('senior_pwd_discount_amount');
        $totalSeniorPwdVatExempt = $transactions->sum('senior_pwd_vat_exempt_amount');
        $totalDiscount = $transactions->sum('discount_amount');

        $byBranch = $transactions->groupBy('branch_id')->map(function ($items) {
            return [
                'branch_name' => $items->first()->branch?->name,
                'transactions' => $items->count(),
                'total_sales' => round($items->sum('total_amount'), 2),
                'vat_amount' => round($items->sum('vat_amount'), 2),
                'vatable_sales' => round($items->sum('vatable_amount'), 2),
                'non_vatable_sales' => round($items->sum('non_vatable_amount'), 2),
                'senior_pwd_discount' => round($items->sum('senior_pwd_discount_amount'), 2),
            ];
        });

        $byPaymentMethod = $transactions->groupBy('payment_method')->map(function ($items) {
            return [
                'count' => $items->count(),
                'total' => round($items->sum('total_amount'), 2),
            ];
        });

        $byDate = $transactions->groupBy(function ($t) {
            return $t->transaction_date->format('Y-m-d');
        })->map(function ($items) {
            return [
                'date' => $items->first()->transaction_date->format('Y-m-d'),
                'transactions' => $items->count(),
                'total_sales' => round($items->sum('total_amount'), 2),
                'vat_amount' => round($items->sum('vat_amount'), 2),
            ];
        });

        return [
            'period' => [
                'from' => $fromDate->toDateString(),
                'to' => $toDate->toDateString(),
            ],
            'summary' => [
                'total_transactions' => $transactions->count(),
                'total_sales' => round($totalSales, 2),
                'total_vat' => round($totalVat, 2),
                'total_vatable_sales' => round($totalVatable, 2),
                'total_non_vatable_sales' => round($totalNonVatable, 2),
                'total_discount' => round($totalDiscount, 2),
                'total_senior_pwd_discount' => round($totalSeniorPwdDiscount, 2),
                'total_senior_pwd_vat_exempt' => round($totalSeniorPwdVatExempt, 2),
            ],
            'by_branch' => $byBranch,
            'by_payment_method' => $byPaymentMethod,
            'daily_breakdown' => $byDate,
        ];
    }

    /**
     * Generate BIR VAT Summary (BIR Form 2550M/2550Q equivalent)
     * 
     * @param int $businessId
     * @param string $periodType 'monthly'|'quarterly'
     * @param Carbon $periodDate
     * @return array
     */
    public function generateVatSummary(int $businessId, string $periodType, Carbon $periodDate): array
    {
        if ($periodType === 'monthly') {
            $fromDate = $periodDate->copy()->startOfMonth();
            $toDate = $periodDate->copy()->endOfMonth();
        } else {
            $fromDate = $periodDate->copy()->startOfQuarter();
            $toDate = $periodDate->copy()->endOfQuarter();
        }

        $report = $this->generateSalesReport($businessId, $fromDate, $toDate);
        
        return [
            'form_type' => $periodType === 'monthly' ? 'BIR Form 2550M' : 'BIR Form 2550Q',
            'period' => $periodType === 'monthly' 
                ? $periodDate->format('F Y') 
                : 'Q' . $periodDate->quarter . ' ' . $periodDate->year,
            'business_tin' => Business::find($businessId)?->tin ?? '000-000-000-000',
            'business_name' => Business::find($businessId)?->name ?? 'WiWaste',
            'total_sales' => $report['summary']['total_sales'] ?? 0,
            'vatable_sales' => $report['summary']['total_vatable_sales'] ?? 0,
            'non_vatable_sales' => $report['summary']['total_non_vatable_sales'] ?? 0,
            'vat_amount' => $report['summary']['total_vat'] ?? 0,
            'discounts' => $report['summary']['total_discount'] ?? 0,
            'senior_pwd_discount' => $report['summary']['total_senior_pwd_discount'] ?? 0,
            'senior_pwd_vat_exempt' => $report['summary']['total_senior_pwd_vat_exempt'] ?? 0,
            'vat_due' => ($report['summary']['total_vat'] ?? 0) - ($report['summary']['total_senior_pwd_vat_exempt'] ?? 0),
        ];
    }

    /**
     * Export sales data for BIR e-submission (JSON format for CAS integration)
     * 
     * @param int $businessId
     * @param Carbon $fromDate
     * @param Carbon $toDate
     * @return array
     */
    public function exportForCasSubmission(int $businessId, Carbon $fromDate, Carbon $toDate): array
    {
        $transactions = SalesTransaction::where('business_id', $businessId)
            ->where('status', 'Completed')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->with(['salesItems.product', 'branch', 'user'])
            ->get();

        $records = $transactions->map(function ($transaction) {
            $business = $transaction->branch?->business ?? $transaction->user?->business;
            $branch = $transaction->branch;
            $cashier = $transaction->user;

            return [
                'tin' => $business?->tin ?? '000-000-000-000',
                'branch_code' => $branch?->id,
                'transaction_id' => $transaction->transaction_id,
                'date' => $transaction->transaction_date->format('Y-m-d'),
                'time' => $transaction->transaction_date->format('H:i:s'),
                'cashier' => $cashier?->Full_name ?? 'Cashier',
                'items' => $transaction->salesItems->map(function ($item) {
                    return [
                        'product_code' => $item->product?->barcode ?? 'N/A',
                        'description' => $item->product?->product_name,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'vat_amount' => $item->vat_amount,
                        'vatable_amount' => $item->vatable_amount,
                        'discount_amount' => $item->discount_amount,
                        'is_senior_pwd_exempt' => $item->is_senior_pwd_exempt,
                    ])->toArray(),
                'totals' => [
                    'total_amount' => $transaction->total_amount,
                    'vat_amount' => $transaction->vat_amount,
                    'vatable_amount' => $transaction->vatable_amount,
                    'non_vatable_amount' => $transaction->non_vatable_amount,
                    'discount' => $transaction->discount_amount,
                    'senior_pwd_discount' => $transaction->senior_pwd_discount_amount,
                    'senior_pwd_vat_exempt' => $transaction->senior_pwd_vat_exempt_amount,
                ],
                'payment' => [
                    'method' => $transaction->payment_method,
                    'reference' => $transaction->payment_reference,
                    'amount_tendered' => $transaction->amount_tendered,
                    'change_due' => $transaction->change_due,
                ],
            ];
        })->toArray();

        return [
            'business_tin' => Business::find($fromDate->month)?->tin ?? '000-000-000-000',
            'branch_code' => 'ALL',
            'period_from' => $fromDate->format('Y-m-d'),
            'period_to' => $toDate->format('Y-m-d'),
            'generated_at' => now()->toISOString(),
            'total_transactions' => $transactions->count(),
            'total_amount' => $transactions->sum('total_amount'),
            'total_vat' => $transactions->sum('vat_amount'),
            'transactions' => $records,
        ];
    }

    /**
     * Generate serial number for receipt (per BIR requirements)
     */
    protected function generateSerialNumber(SalesTransaction $transaction): string
    {
        $branch = $transaction->branch;
        $date = $transaction->transaction_date;
        
        return 'SER-' . $transaction->transaction_id;
    }

    /**
     * Get POS serial number (placeholder for fiscal printer integration)
     */
    protected function getPosSerial(?Branch $branch): string
    {
        return $branch?->pos_serial ?? 'POS-' . ($branch?->id ?? '001');
    }

    /**
     * Get customer information for receipt
     */
    protected function getCustomerInfo($transaction): array
    {
        $seniorPwd = $transaction->senior_pwd_type !== 'none';
        
        return [
            'name' => $transaction->customer_name,
            'phone' => $transaction->customer_phone,
            'email' => $transaction->customer_email,
            'senior_pwd' => $seniorPwd ? [
                'type' => $transaction->senior_pwd_type,
                'id' => $transaction->senior_pwd_id,
                'name' => $transaction->senior_pwd_name,
                'discount' => $transaction->senior_pwd_discount_amount ?? 0,
            ] : null,
        ];
    }
}