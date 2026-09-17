<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesTransaction;
use App\Models\SalesItem;
use App\Models\Inventory;
use App\Models\FEFOBatch;
use App\Models\StockMovement;
use App\Models\AuditLog;
use App\Jobs\WarmAnalyticsCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesTransactionController extends Controller
{
    // Philippine VAT rate
    const VAT_RATE = 0.12;
    // Senior/PWD discount rate (RA 9994/10754)
    const SENIOR_PWD_DISCOUNT_RATE = 0.20;

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

    /**
     * Get FEFO batches for a product ordered by earliest expiry first
     * Returns batches with available stock for the given business and branch
     */
    protected function getFEFObatchesForProduct(int $productId, Request $request): \Illuminate\Support\Collection
    {
        $user = $request->user();
        
        return FEFOBatch::where('product_id', $productId)
            ->where('business_id', $user?->business_id)
            ->where('branch_id', $user?->branch_id)
            ->where('status', 'active')
            ->where('quantity', '>', 0)
            ->where('expiry_date', '>=', now())
            ->orderBy('expiry_date')
            ->orderBy('created_at')
            ->lockForUpdate()
            ->get();
    }

    /**
     * Deduct stock using FEFO (First Expired, First Out) method
     * Returns array of [batch_id => quantity_deducted] for stock movement records
     * Falls back to legacy behavior if no FEFO batches exist
     */
    protected function deductStockFEFO(int $productId, int $quantity, Request $request): array
    {
        $batches = $this->getFEFObatchesForProduct($productId, $request);
        
        // If no FEFO batches exist, fall back to legacy behavior (no batch tracking)
        if ($batches->isEmpty()) {
            return ['legacy' => $quantity];
        }
        
        $totalAvailable = $batches->sum('quantity');
        if ($totalAvailable < $quantity) {
            throw new \InvalidArgumentException("Insufficient stock across all batches for product #{$productId}. Available: {$totalAvailable}, requested: {$quantity}");
        }
        
        $deductions = [];
        $remainingQty = $quantity;
        
        foreach ($batches as $batch) {
            if ($remainingQty <= 0) {
                break;
            }
            
            $deductQty = min($batch->quantity, $remainingQty);
            $batch->quantity -= $deductQty;
            $batch->stock_status = Inventory::calcStatus($batch->quantity, $batch->product?->reorder_level ?? 10);
            $batch->last_updated = now();
            $batch->save();
            
            $deductions[$batch->batch_id] = $deductQty;
            $remainingQty -= $deductQty;
        }
        
        return $deductions;
    }

    protected function calculateItemVat(float $sellingPrice, int $quantity, bool $isVatExempt = false): array
    {
        // sellingPrice is the actual unit price the customer pays (after all discounts)
        $subtotal = $sellingPrice * $quantity;
        if ($isVatExempt) {
            return [
                'vatable_amount' => 0,
                'non_vatable_amount' => $subtotal,
                'vat_amount' => 0,
            ];
        }
        // VAT-inclusive price: vatable_amount = subtotal / 1.12, vat = vatable * 0.12
        $vatableAmount = round($subtotal / 1.12, 2);
        $vatAmount = round($vatableAmount * self::VAT_RATE, 2);
        return [
            'vatable_amount' => $vatableAmount,
            'non_vatable_amount' => 0,
            'vat_amount' => $vatAmount,
        ];
    }

    protected function applySeniorPWD($subtotal, $discountPct = 0): array
    {
        // Senior/PWD gets 20% discount + VAT exemption on the discounted amount
        $seniorPWDiscount = round($subtotal * self::SENIOR_PWD_DISCOUNT_RATE, 2);
        $discountedSubtotal = $subtotal - $seniorPWDiscount;
        
        // VAT on discounted amount (if not VAT exempt)
        // For Senior/PWD, the VAT is computed on the VAT-exempt portion
        $vatExemptAmount = $discountedSubtotal;
        $vatOnExempt = 0;
        
        return [
            'senior_pwd_discount_amount' => $seniorPWDiscount,
            'senior_pwd_vat_exempt_amount' => $vatExemptAmount,
            'discounted_subtotal' => $discountedSubtotal,
        ];
    }

    public function index(Request $request)
    {
        $query = SalesTransaction::with(['user', 'salesItems.product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('transaction_id', 'like', "%{$search}%")
                  ->orWhereHas('salesItems.product', fn ($p) => $p->where('product_name', 'like', "%{$search}%"));
            });
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json(
            $query->orderByDesc('transaction_date')->paginate($perPage)->through(fn ($t) => [
                'id'               => $t->transaction_id,
                'cashier'          => $t->user?->Full_name ?? 'Cashier',
                'total_amount'     => $t->total_amount,
                'vat_amount'       => $t->vat_amount,
                'vatable_amount'   => $t->vatable_amount,
                'non_vatable_amount' => $t->non_vatable_amount,
                'senior_pwd_discount_amount' => $t->senior_pwd_discount_amount,
                'senior_pwd_vat_exempt_amount' => $t->senior_pwd_vat_exempt_amount,
                'discount_amount'  => $t->discount_amount,
                'transaction_date' => $t->transaction_date,
                'payment_method'   => $t->payment_method,
                'payment_reference'=> $t->payment_reference,
                'payment_status'   => $t->payment_status,
                'amount_tendered'  => $t->amount_tendered,
                'change_due'       => $t->change_due,
                'status'           => $t->status,
                'business_id'      => $t->business_id,
                'branch_id'        => $t->branch_id,
                'customer_name'    => $t->customer_name,
                'customer_phone'   => $t->customer_phone,
                'customer_email'   => $t->customer_email,
                'senior_pwd_id'    => $t->senior_pwd_id,
                'senior_pwd_type'  => $t->senior_pwd_type,
                'items'            => $t->salesItems->map(fn ($item) => [
                    'id'                 => $item->sales_item_id,
                    'product_name'       => $item->product?->product_name,
                    'sku'                => $item->product?->barcode,
                    'quantity'           => $item->quantity,
                    'unit_price'         => $item->unit_price,
                    'subtotal'           => $item->subtotal,
                    'vat_amount'         => $item->vat_amount,
                    'vatable_amount'     => $item->vatable_amount,
                    'discount_amount'    => $item->discount_amount,
                    'discount_pct'       => $item->discount_pct,
                    'is_senior_pwd_exempt' => $item->is_senior_pwd_exempt,
                ]),
            ])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'payment_method'             => 'required|in:Cash,E-wallet,Credit Card,Debit Card',
            'payment_reference'          => 'nullable|string|max:100',
            'amount_tendered'            => 'nullable|numeric|min:0',
            'change_due'                 => 'nullable|numeric|min:0',
            'senior_pwd_name'            => 'nullable|string|max:100',
            'senior_pwd_id'              => 'nullable|string|max:50',
            'senior_pwd_type'            => 'nullable|in:senior,pwd,none',
            'customer_name'              => 'nullable|string|max:255',
            'customer_phone'             => 'nullable|string|max:20',
            'customer_email'             => 'nullable|string|max:255',
            'items'                      => 'required|array|min:1',
            'items.*.product_id'         => 'required|integer|exists:Product,product_id',
            'items.*.quantity'           => 'required|integer|min:1',
            'items.*.unit_price'         => 'required|numeric|min:0',
            'items.*.discount_pct'       => 'nullable|numeric|min:0|max:1',
            'items.*.discount_amount'    => 'nullable|numeric|min:0',
            'items.*.override_reason'    => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $userId = $user?->User_id ?? 1;

        return DB::transaction(function () use ($data, $userId, $user, $request) {
            // First pass: validate stock and calculate totals
            $query = Inventory::whereIn('product_id', collect($data['items'])->pluck('product_id'));
            $query = $this->scopeForBusinessAndBranch($query, $request);
            $lockedInventories = $query->with('product')
                ->lockForUpdate()
                ->get()
                ->keyBy('product_id');

            $isSeniorPWD = in_array($data['senior_pwd_type'] ?? 'none', ['senior', 'pwd']);
            $seniorPWDiscountRate = self::SENIOR_PWD_DISCOUNT_RATE;

            $totalVat = 0;
            $totalVatable = 0;
            $totalNonVatable = 0;
            $totalSeniorPWDiscount = 0;
            $totalSeniorPWVatExempt = 0;
            $totalDiscount = 0;
            $discountBreakdown = [];

            foreach ($data['items'] as $index => $item) {
                $inventory = $lockedInventories->get($item['product_id']);
                if (!$inventory) {
                    return response()->json([
                        'message' => "No inventory record for product #{$item['product_id']}.",
                    ], 422);
                }
                
                // Validate stock using FEFO batches (if available) or inventory aggregate
                $batches = $this->getFEFObatchesForProduct($item['product_id'], $request);
                $totalAvailable = $batches->sum('quantity');
                
                // If no FEFO batches, fall back to inventory aggregate
                if ($batches->isEmpty()) {
                    $totalAvailable = $inventory->current_stock;
                }
                
                if ($totalAvailable < $item['quantity']) {
                    $productName = $inventory->product?->product_name ?? "Product #{$item['product_id']}";
                    return response()->json([
                        'message' => "Insufficient stock for {$productName}. Available: {$totalAvailable}, requested: {$item['quantity']}.",
                    ], 422);
                }

                $unitPrice = $item['unit_price'];
                $quantity = $item['quantity'];
                $discountPct = $item['discount_pct'] ?? 0;
                $discountAmt = $item['discount_amount'] ?? 0;
                $isSeniorPWDItem = $isSeniorPWD && $item['quantity'] > 0;

                $subtotal = $unitPrice * $quantity;

                // Apply item-level discount
                if ($discountAmt > 0) {
                    $subtotal -= $discountAmt;
                    $totalDiscount += $discountAmt;
                    $discountBreakdown[] = [
                        'type' => 'item_discount',
                        'product_id' => $item['product_id'],
                        'amount' => $discountAmt,
                    ];
                } elseif ($discountPct > 0) {
                    $discountAmt = round($subtotal * $discountPct, 2);
                    $subtotal -= $discountAmt;
                    $totalDiscount += $discountAmt;
                    $discountBreakdown[] = [
                        'type' => 'item_discount_pct',
                        'product_id' => $item['product_id'],
                        'pct' => $discountPct,
                        'amount' => $discountAmt,
                    ];
                }

                // Apply Senior/PWD discount
                $seniorPWDiscount = 0;
                $seniorPWVatExempt = 0;
                if ($isSeniorPWDItem) {
                    $seniorPWDiscount = round($subtotal * $seniorPWDiscountRate, 2);
                    $subtotal -= $seniorPWDiscount;
                    $totalSeniorPWDiscount += $seniorPWDiscount;
                    $totalSeniorPWVatExempt += $subtotal; // VAT exempt after discount
                    $discountBreakdown[] = [
                        'type' => 'senior_pwd_discount',
                        'product_id' => $item['product_id'],
                        'rate' => self::SENIOR_PWD_DISCOUNT_RATE,
                        'amount' => $seniorPWDiscount,
                    ];
                } else {
                    // Not senior/PWD - calculate VAT normally
                    $vatCalc = $this->calculateItemVat($unitPrice, $quantity, false);
                    $totalVat += $vatCalc['vat_amount'];
                    $totalVatable += $vatCalc['vatable_amount'];
                    $totalNonVatable += $vatCalc['non_vatable_amount'];
                }
            }

            $totalAmount = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']) - $totalDiscount - $totalSeniorPWDiscount;

            $transactionData = [
                'user_id'                    => $userId,
                'total_amount'               => round($totalAmount, 2),
                'vat_amount'                 => round($totalVat, 2),
                'vatable_amount'             => round($totalVatable, 2),
                'non_vatable_amount'         => round($totalNonVatable, 2),
                'senior_pwd_discount_amount' => round($totalSeniorPWDiscount, 2),
                'senior_pwd_vat_exempt_amount' => round($totalSeniorPWVatExempt, 2),
                'discount_amount'            => round($totalDiscount, 2),
                'discount_breakdown'         => $discountBreakdown,
                'transaction_date'           => now(),
                'payment_method'             => $data['payment_method'],
                'payment_reference'          => $data['payment_reference'] ?? null,
                'payment_status'             => 'Paid',
                'amount_tendered'            => $data['amount_tendered'] ?? null,
                'change_due'                 => $data['change_due'] ?? null,
                'senior_pwd_name'            => $data['senior_pwd_name'] ?? null,
                'senior_pwd_id'              => $data['senior_pwd_id'] ?? null,
                'senior_pwd_type'            => $data['senior_pwd_type'] ?? 'none',
                'customer_name'              => $data['customer_name'] ?? null,
                'customer_phone'             => $data['customer_phone'] ?? null,
                'customer_email'             => $data['customer_email'] ?? null,
                'status'                     => 'Completed',
            ];

            if ($user && $user->business_id) {
                $transactionData['business_id'] = $user->business_id;
            }
            if ($user && $user->branch_id) {
                $transactionData['branch_id'] = $user->branch_id;
            }

            $transaction = SalesTransaction::create($transactionData);

            // Deduct stock using FEFO (First Expired, First Out)
            foreach ($data['items'] as $item) {
                $unitPrice = $item['unit_price'];
                $quantity = $item['quantity'];
                $discountPct = $item['discount_pct'] ?? 0;
                $discountAmt = $item['discount_amount'] ?? 0;
                $isSeniorPWDItem = $isSeniorPWD && $item['quantity'] > 0;

                $subtotal = $unitPrice * $quantity;

                // Apply discounts
                if ($discountAmt > 0) {
                    $subtotal -= $discountAmt;
                } elseif ($discountPct > 0) {
                    $discountAmt = round($subtotal * $discountPct, 2);
                    $subtotal -= $discountAmt;
                }

                $seniorPWDiscount = 0;
                $isVatExempt = false;
                if ($isSeniorPWDItem) {
                    $seniorPWDiscount = round($subtotal * $seniorPWDiscountRate, 2);
                    $subtotal -= $seniorPWDiscount;
                    $isVatExempt = true;
                }

                // Actual selling price per unit (after all discounts)
                $sellingPrice = $quantity > 0 ? round($subtotal / $quantity, 2) : $unitPrice;

                // Calculate VAT for this item using the actual selling price
                $vatCalc = $this->calculateItemVat($sellingPrice, $quantity, $isVatExempt);

                $saleItem = SalesItem::create([
                    'transaction_id'      => $transaction->transaction_id,
                    'product_id'          => $item['product_id'],
                    'quantity'            => $quantity,
                    'unit_price'          => $unitPrice,
                    'original_price'      => ($discountPct ?? 0)
                        ? round($unitPrice / (1 - $discountPct), 2)
                        : null,
                    'subtotal'            => round($subtotal, 2),
                    'vat_amount'          => $vatCalc['vat_amount'],
                    'vatable_amount'      => $vatCalc['vatable_amount'],
                    'discount_amount'     => $discountAmt + $seniorPWDiscount,
                    'discount_pct'        => $discountPct ?: null,
                    'is_senior_pwd_exempt' => $isSeniorPWDItem,
                    'override_reason'     => $item['override_reason'] ?? null,
                ]);

                // Deduct stock using FEFO (First Expired, First Out)
                $batchDeductions = $this->deductStockFEFO($item['product_id'], $quantity, $request);

                // Create stock movements for each batch deducted (FEFO)
                foreach ($batchDeductions as $batchId => $deductQty) {
                    // Handle legacy case (no FEFO batches)
                    if ($batchId === 'legacy') {
                        // Update inventory aggregate
                        $inventory = $lockedInventories->get($item['product_id']);
                        if ($inventory) {
                            $inventory->current_stock -= $deductQty;
                            $inventory->stock_status  = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                            $inventory->last_updated  = now();
                            $inventory->save();
                        }

                        StockMovement::create([
                            'business_id'   => $user?->business_id,
                            'branch_id'     => $user?->branch_id,
                            'product_id'    => $item['product_id'],
                            'batch_id'      => null,
                            'user_id'       => $userId,
'movement_type' => 'Stock Out',
                            'quantity'      => $deductQty,
                            'remarks'       => 'Sale - Txn #' . $transaction->transaction_id,
                            'movement_date' => now(),
                            'sale_item_id'  => $saleItem->sales_item_id,
                        ]);
                        continue;
                    }
                    
                    FEFOBatch::find($batchId);
                    
                    // Update inventory aggregate
                    $inventory = $lockedInventories->get($item['product_id']);
                    if ($inventory) {
                        $inventory->current_stock -= $deductQty;
                        $inventory->stock_status  = Inventory::calcStatus($inventory->current_stock, $inventory->product?->reorder_level ?? 10);
                        $inventory->last_updated  = now();
                        $inventory->save();
                    }

                    StockMovement::create([
                        'business_id'   => $user?->business_id,
                        'branch_id'     => $user?->branch_id,
                        'product_id'    => $item['product_id'],
                        'batch_id'      => $batchId,
                        'user_id'       => $userId,
                        'movement_type' => 'Sale',
                        'quantity'      => $deductQty,
                        'remarks'       => 'Sale - Txn #' . $transaction->transaction_id,
                        'movement_date' => now(),
                        'sale_item_id'  => $saleItem->sales_item_id,
                    ]);
                }
            }

            AuditLog::create([
                'user_id'       => $userId,
                'action'        => "POS sale #{$transaction->transaction_id}: {$totalAmount} via {$data['payment_method']}",
                'entity_type'   => 'Sales',
                'entity_id'     => $transaction->transaction_id,
                'old_values'    => null,
                'new_values'    => json_encode([
                    'total' => $totalAmount, 
                    'items' => count($data['items']),
                    'vat' => $totalVat,
                    'senior_pwd_discount' => $totalSeniorPWDiscount,
                ]),
                'created_at'    => now(),
                'business_id'   => $user?->business_id,
                'branch_id'     => $user?->branch_id,
            ]);

            WarmAnalyticsCache::dispatch();

            return response()->json([
                'message'        => 'Transaction completed.',
                'transaction_id' => $transaction->transaction_id,
                'total_amount'   => $totalAmount,
                'vat_amount'     => round($totalVat, 2),
                'vatable_amount' => round($totalVatable, 2),
                'senior_pwd_discount' => round($totalSeniorPWDiscount, 2),
            ], 201);
        });
    }

    public function show(Request $request, int $id)
    {
        $query = SalesTransaction::with(['user', 'salesItems.product']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $transaction = $query->find($id);

        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found.'], 404);
        }

        return response()->json([
            'id'                => $transaction->transaction_id,
            'cashier'           => $transaction->user?->Full_name ?? 'Cashier',
            'total_amount'      => $transaction->total_amount,
            'vat_amount'        => $transaction->vat_amount,
            'vatable_amount'    => $transaction->vatable_amount,
            'non_vatable_amount' => $transaction->non_vatable_amount,
            'senior_pwd_discount_amount' => $transaction->senior_pwd_discount_amount,
            'senior_pwd_vat_exempt_amount' => $transaction->senior_pwd_vat_exempt_amount,
            'discount_amount'   => $transaction->discount_amount,
            'discount_breakdown' => $transaction->discount_breakdown,
            'transaction_date'  => $transaction->transaction_date,
            'payment_method'    => $transaction->payment_method,
            'payment_reference' => $transaction->payment_reference,
            'payment_status'    => $transaction->payment_status,
            'amount_tendered'   => $transaction->amount_tendered,
            'change_due'        => $transaction->change_due,
            'status'            => $transaction->status,
            'business_id'       => $transaction->business_id,
            'branch_id'         => $transaction->branch_id,
            'customer_name'     => $transaction->customer_name,
            'customer_phone'    => $transaction->customer_phone,
            'customer_email'    => $transaction->customer_email,
            'senior_pwd_id'     => $transaction->senior_pwd_id,
            'senior_pwd_type'   => $transaction->senior_pwd_type,
            'items'             => $transaction->salesItems->map(fn ($item) => [
                'id'                 => $item->sales_item_id,
                'product_name'       => $item->product?->product_name,
                'sku'                => $item->product?->barcode,
                'quantity'           => $item->quantity,
                'unit_price'         => $item->unit_price,
                'subtotal'           => $item->subtotal,
                'vat_amount'         => $item->vat_amount,
                'vatable_amount'     => $item->vatable_amount,
                'discount_amount'    => $item->discount_amount,
                'discount_pct'       => $item->discount_pct,
                'is_senior_pwd_exempt' => $item->is_senior_pwd_exempt,
            ]),
        ]);
    }

    public function receipt(Request $request, int $id)
    {
        $query = SalesTransaction::with(['user', 'salesItems.product', 'branch']);
        $query = $this->scopeForBusinessAndBranch($query, $request);
        $transaction = $query->find($id);

        if (!$transaction) {
            return response()->json(['message' => 'Transaction not found.'], 404);
        }

        $business = $transaction->branch?->business ?? $transaction->business;
        $branch = $transaction->branch;

        // Generate receipt serial number (ATP + date + sequence)
        $receiptSerial = 'ATP-' . $transaction->transaction_id . '-' . now()->format('YmdHis');

        return response()->json([
            'receipt' => [
                // BIR Required Fields
                'atp_number' => $business?->atp_number ?? 'ATP-000000000',
                'atp_expiry' => $business?->atp_expiry ?? null,
                'permit_number' => $business?->permit_number ?? null,
                'receipt_serial' => $receiptSerial,
                
                // Business Information
                'business_name' => $business?->name ?? 'WiWaste',
                'business_trade_name' => $business?->trade_name ?? null,
                'business_address' => $branch?->address ?? $business?->address ?? 'N/A',
                'business_tin' => $business?->tin ?? 'N/A',
                'business_vat_reg' => $business?->vat_registered ? 'VAT' : 'NON-VAT',
                
                // Branch Information
                'branch_name' => $branch?->name ?? null,
                'branch_address' => $branch?->address ?? null,
                'branch_code' => $branch?->code ?? null,
                
                // Transaction Information
                'transaction_id' => $transaction->transaction_id,
                'transaction_date' => $transaction->transaction_date,
                'transaction_time' => $transaction->transaction_date ? $transaction->transaction_date->format('H:i:s') : null,
                
                // Cashier
                'cashier' => $transaction->user?->Full_name ?? 'Cashier',
                'cashier_id' => $transaction->user_id,
                
                // Payment
                'payment_method' => $transaction->payment_method,
                'payment_reference' => $transaction->payment_reference,
                'amount_tendered' => $transaction->amount_tendered,
                'change_due' => $transaction->change_due,
                
                // Senior/PWD
                'senior_pwd' => $transaction->senior_pwd_type !== 'none' ? [
                    'type' => $transaction->senior_pwd_type,
                    'id' => $transaction->senior_pwd_id,
                    'name' => $transaction->senior_pwd_name,
                    'discount' => $transaction->senior_pwd_discount_amount,
                ] : null,
                
                // Items with VAT breakdown
                'items' => $transaction->salesItems->map(fn ($item) => [
                    'product_name' => $item->product?->product_name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'discount_amount' => $item->discount_amount,
                    'discount_pct' => $item->discount_pct,
                    'subtotal' => $item->subtotal,
                    'vat_amount' => $item->vat_amount,
                    'vatable_amount' => $item->vatable_amount,
                    'non_vatable_amount' => $item->non_vatable_amount,
                    'discount_amount' => $item->discount_amount,
                    'is_senior_pwd_exempt' => $item->is_senior_pwd_exempt,
                ]),
                
                // VAT Breakdown (BIR Compliant)
                'vat_breakdown' => [
                    'vatable_sales' => $transaction->vatable_amount,
                    'vat_exempt_sales' => $transaction->non_vatable_amount + $transaction->senior_pwd_vat_exempt_amount,
                    'zero_rated_sales' => 0,
                    'vat_amount' => $transaction->vat_amount,
                ],
                
                // Totals
                'totals' => [
                    'gross_sales' => $transaction->total_amount + $transaction->discount_amount + $transaction->senior_pwd_discount_amount,
                    'discount' => $transaction->discount_amount,
                    'senior_pwd_discount' => $transaction->senior_pwd_discount_amount,
                    'senior_pwd_vat_exempt' => $transaction->senior_pwd_vat_exempt_amount,
                    'vatable_sales' => $transaction->vatable_amount,
                    'non_vatable_sales' => $transaction->non_vatable_amount,
                    'vat_exempt_sales' => $transaction->senior_pwd_vat_exempt_amount,
                    'vat_amount' => $transaction->vat_amount,
                    'total' => $transaction->total_amount,
                ],
                
                // Payment
                'payment' => [
                    'method' => $transaction->payment_method,
                    'reference' => $transaction->payment_reference,
                    'amount_tendered' => $transaction->amount_tendered,
                    'change_due' => $transaction->change_due,
                ],
            ],
        ]);
    }
}