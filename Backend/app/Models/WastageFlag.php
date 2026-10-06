<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WastageFlag extends Model
{
    protected $table = 'wastage_flags';

    protected $primaryKey = 'flag_id';

    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'product_id',
        'batch_id',
        'flagged_by',
        'quantity',
        'reason',
        'notes',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'reviewed_at' => 'datetime',
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

    public function batch()
    {
        return $this->belongsTo(FEFOBatch::class, 'batch_id', 'batch_id');
    }

    public function flaggedBy()
    {
        return $this->belongsTo(User::class, 'flagged_by', 'User_id');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'User_id');
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

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}
