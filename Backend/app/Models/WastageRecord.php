<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WastageRecord extends Model
{
    protected $table = 'Wastage_Record';
    protected $primaryKey = 'wastage_id';
    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'product_id',
        'batch_id',
        'user_id',
        'wastage_type',
        'quantity',
        'estimated_loss',
        'date_recorded',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'estimated_loss' => 'decimal:2',
        'date_recorded' => 'date',
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

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
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
}