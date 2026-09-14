<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'User';
    protected $primaryKey = 'User_id';
    public $timestamps = false;

    protected $fillable = [
        'Full_name',
        'username',
        'password',
        'email',
        'role',
        'status',
        'Created_at',
        'business_id',
        'branch_id',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'user_id', 'User_id');
    }

    public function salesTransactions()
    {
        return $this->hasMany(SalesTransaction::class, 'user_id', 'User_id');
    }

    public function wastageRecords()
    {
        return $this->hasMany(WastageRecord::class, 'user_id', 'User_id');
    }

    public function returnTransactions()
    {
        return $this->hasMany(ReturnTransaction::class, 'user_id', 'User_id');
    }

    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class, 'user_id', 'User_id');
    }

    public function createdBatches()
    {
        return $this->hasMany(FEFOBatch::class, 'created_by', 'User_id');
    }

    public function receivedStock()
    {
        return $this->hasMany(StockReceiving::class, 'received_by', 'User_id');
    }

    public function verifiedStock()
    {
        return $this->hasMany(StockReceiving::class, 'verified_by', 'User_id');
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

    public function scopeOwners($query)
    {
        return $query->where('role', 'Owner');
    }

    public function scopeInventory($query)
    {
        return $query->where('role', 'Inventory');
    }

    public function scopeCashiers($query)
    {
        return $query->where('role', 'Cashier');
    }

    public function scopePharmacists($query)
    {
        return $query->where('role', 'Pharmacist');
    }
}