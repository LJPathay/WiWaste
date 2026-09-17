<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesTransaction extends Model
{
    protected $table = 'Sales_Transaction';
    protected $primaryKey = 'transaction_id';
    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'user_id',
        'total_amount',
        'vat_amount',
        'vatable_amount',
        'non_vatable_amount',
        'senior_pwd_discount_amount',
        'senior_pwd_vat_exempt_amount',
        'discount_amount',
        'discount_breakdown',
        'transaction_date',
        'payment_method',
        'payment_reference',
        'payment_status',
        'amount_tendered',
        'change_due',
        'status',
        'global_discount_pct',
        'senior_pwd_name',
        'senior_pwd_id',
        'senior_pwd_type',
        'customer_name',
        'customer_phone',
        'customer_email',
        'paymongo_intent_id',
        'paymongo_checkout_url',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'vatable_amount' => 'decimal:2',
        'non_vatable_amount' => 'decimal:2',
        'senior_pwd_discount_amount' => 'decimal:2',
        'senior_pwd_vat_exempt_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'amount_tendered' => 'decimal:2',
        'change_due' => 'decimal:2',
        'global_discount_pct' => 'decimal:2',
        'transaction_date' => 'datetime',
        'discount_breakdown' => 'json',
        'paymongo_intent_id' => 'string',
        'paymongo_checkout_url' => 'string',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }

    public function salesItems()
    {
        return $this->hasMany(SalesItem::class, 'transaction_id', 'transaction_id');
    }

    public function items()
    {
        return $this->salesItems();
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