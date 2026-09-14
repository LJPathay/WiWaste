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
}