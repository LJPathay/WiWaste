<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FEFOBatch extends Model
{
    protected $table = 'FEFO_Batch';
    protected $primaryKey = 'batch_id';
    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'product_id',
        'batch_number',
        'quantity',
        'expiry_date',
        'status',
        'directive_notes',
        'created_by',
        'created_at',
        'received_date',
        'received_temperature',
        'supplier_batch_number',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'expiry_date' => 'date',
        'received_date' => 'date',
        'received_temperature' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'User_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'batch_id', 'batch_id');
    }

    public function wastageRecords()
    {
        return $this->hasMany(WastageRecord::class, 'batch_id', 'batch_id');
    }

    // Scopes
    public function scopeForBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeExpiringSoon($query, $days = 30)
    {
        return $query->where('expiry_date', '<=', now()->addDays($days))
            ->where('status', '!=', 'expired');
    }

    public function scopeCritical($query)
    {
        return $query->where('expiry_date', '<=', now()->addDays(7))
            ->where('status', '!=', 'expired');
    }

    // Traceability methods
    public function getUpstreamTrace(): array
    {
        // One-up: Supplier → This batch
        $trace = [];
        
        // Get the stock receiving record that created this batch
        $receiving = StockReceiving::whereHas('supplier', function ($q) {
            $q->where('supplier_id', $this->product->supplier_id ?? 0);
        })->where('supplier_batch_number', $this->supplier_batch_number)->first();

        if ($receiving) {
            $trace[] = [
                'level' => 'supplier',
                'entity_type' => 'Stock_Receiving',
                'entity_id' => $receiving->receiving_id,
                'supplier_name' => $receiving->supplier?->supplier_name,
                'supplier_batch_number' => $this->supplier_batch_number,
                'received_date' => $receiving->received_at,
                'received_temperature' => $receiving->temperature_at_receipt,
                'condition_check_passed' => $receiving->condition_check_passed,
                'sanitation_check_passed' => $receiving->sanitation_check_passed,
                'verified_by' => $receiving->verifier?->Full_name,
                'verified_at' => $receiving->verified_at,
            ];
        }

        // Supplier info
        $supplier = $this->product?->supplier;
        if ($supplier) {
            $trace[] = [
                'level' => 'supplier',
                'entity_type' => 'Supplier',
                'entity_id' => $supplier->supplier_id,
                'supplier_name' => $supplier->supplier_name,
                'fda_lto_number' => $supplier->fda_lto_number,
                'fda_lto_expiry' => $supplier->fda_lto_expiry,
                'fda_cpr_number' => $supplier->fda_cpr_number,
                'fda_cpr_expiry' => $supplier->fda_cpr_expiry,
            ];
        }

        return $trace;
    }

    public function getDownstreamTrace(): array
    {
        // One-down: This batch → Sales/Wastage/Movements
        $trace = [];

        // Stock movements from this batch
        $movements = $this->stockMovements()
            ->with(['user', 'salesItem.transaction'])
            ->orderBy('movement_date')
            ->get();

        foreach ($movements as $movement) {
            $traceItem = [
                'level' => 'movement',
                'entity_type' => 'Stock_Movement',
                'entity_id' => $movement->movement_id,
                'movement_type' => $movement->movement_type,
                'quantity' => $movement->quantity,
                'date' => $movement->movement_date,
                'recorded_by' => $movement->user?->Full_name,
                'remarks' => $movement->remarks,
            ];

            // If it's a sale, add transaction details
            if ($movement->movement_type === 'Sale' && $movement->salesItem && $movement->salesItem->transaction) {
                $txn = $movement->salesItem->transaction;
                $traceItem['sale'] = [
                    'transaction_id' => $txn->transaction_id,
                    'customer_name' => $txn->customer_name,
                    'customer_phone' => $txn->customer_phone,
                    'payment_method' => $txn->payment_method,
                    'total_amount' => $txn->total_amount,
                ];
            }

            // If it's wastage
            if ($movement->movement_type === 'Wastage' && $movement->wastageRecord) {
                $traceItem['wastage'] = [
                    'wastage_id' => $movement->wastageRecord->wastage_id,
                    'wastage_type' => $movement->wastageRecord->wastage_type,
                    'estimated_loss' => $movement->wastageRecord->estimated_loss,
                ];
            }

            $trace[] = $traceItem;
        }

        return $trace;
    }

    public function getFullTrace(): array
    {
        return array_merge($this->getUpstreamTrace(), $this->getDownstreamTrace());
    }
}