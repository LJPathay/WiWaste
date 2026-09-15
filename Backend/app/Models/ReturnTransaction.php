<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnTransaction extends Model
{
    protected $table = 'Return_Transaction';
    protected $primaryKey = 'return_id';
    public $timestamps = false;

    protected $fillable = [
        'sale_item_id',
        'user_id',
        'quantity_returned',
        'reason',
        'refund_amount',
        'return_date',
        'business_id',
        'branch_id',
        'return_reason_code',
        'evidence_notes',
        'evidence_photos',
        'approval_status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'is_within_7_days',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
        'return_date' => 'date',
        'evidence_photos' => 'array',
        'approved_at' => 'datetime',
        'is_within_7_days' => 'boolean',
    ];

    public function salesItem()
    {
        return $this->belongsTo(SalesItem::class, 'sale_item_id', 'sales_item_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by', 'User_id');
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
        return $query->where('approval_status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('approval_status', 'approved');
    }
}