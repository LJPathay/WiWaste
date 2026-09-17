<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockReceivingItem extends Model
{
    protected $table = 'stock_receiving_items';
    protected $primaryKey = 'receiving_item_id';
    public $timestamps = true;

    protected $fillable = [
        'receiving_id',
        'product_id',
        'batch_id',
        'po_item_id',
        'expected_quantity',
        'received_quantity',
        'rejected_quantity',
        'unit_cost',
        'temperature_at_receipt',
        'condition_check_passed',
        'sanitation_check_passed',
        'status',
        'notes',
    ];

    protected $casts = [
        'expected_quantity' => 'integer',
        'received_quantity' => 'integer',
        'rejected_quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'temperature_at_receipt' => 'decimal:2',
        'condition_check_passed' => 'boolean',
        'sanitation_check_passed' => 'boolean',
    ];

    public function receiving()
    {
        return $this->belongsTo(StockReceiving::class, 'receiving_id', 'receiving_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function batch()
    {
        return $this->belongsTo(FEFOBatch::class, 'batch_id', 'batch_id');
    }

    public function purchaseOrderItem()
    {
        return $this->belongsTo(PurchaseOrderItem::class, 'po_item_id', 'po_item_id');
    }

    public function scopeForBusiness($query, $businessId)
    {
        return $query->whereHas('receiving', function ($q) use ($businessId) {
            $q->where('business_id', $businessId);
        });
    }

    public function scopeForBranch($query, $branchId)
    {
        return $query->whereHas('receiving', function ($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        });
    }

    public function getPendingQuantityAttribute(): int
    {
        return $this->expected_quantity - $this->received_quantity - $this->rejected_quantity;
    }
}
