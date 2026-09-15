<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorReturn extends Model
{
    protected $table = 'Vendor_Returns';
    protected $primaryKey = 'vendor_return_id';
    public $timestamps = true;

    protected $fillable = [
        'business_id',
        'branch_id',
        'supplier_id',
        'created_by',
        'approved_by',
        'return_number',
        'status',
        'return_reason_code',
        'notes',
        'total_credit_amount',
        'requested_date',
        'approved_date',
        'shipped_date',
        'received_date',
        'credited_date',
    ];

    protected $casts = [
        'total_credit_amount' => 'decimal:2',
        'requested_date' => 'date',
        'approved_date' => 'date',
        'shipped_date' => 'date',
        'received_date' => 'date',
        'credited_date' => 'date',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'User_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by', 'User_id');
    }

    public function items()
    {
        return $this->hasMany(VendorReturnItem::class, 'vendor_return_id', 'vendor_return_id');
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
        return $query->where('status', 'pending_approval');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    // Methods
    public function calculateTotalCredit()
    {
        return $this->items()->sum('total_credit');
    }

    public function approve(int $approverId)
    {
        $this->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_date' => now()->toDateString(),
        ]);
    }

    public function reject(int $approverId, string $reason)
    {
        $this->update([
            'status' => 'rejected',
            'approved_by' => $approverId,
            'notes' => ($this->notes ? $this->notes . "\n" : '') . "Rejected: {$reason}",
        ]);
    }

    public function ship()
    {
        $this->update([
            'status' => 'shipped',
            'shipped_date' => now()->toDateString(),
        ]);
    }

    public function receive()
    {
        $this->update([
            'status' => 'received',
            'received_date' => now()->toDateString(),
        ]);
    }

    public function credit()
    {
        $this->update([
            'status' => 'credited',
            'credited_date' => now()->toDateString(),
        ]);
    }
}