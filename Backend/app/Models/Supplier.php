<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $table = 'Supplier';
    protected $primaryKey = 'supplier_id';
    public $timestamps = false;

    protected $fillable = [
        'supplier_name',
        'contact_person',
        'contact_number',
        'address',
        'business_id',
        'fda_lto_number',
        'fda_lto_expiry',
        'fda_cpr_number',
        'fda_cpr_expiry',
    ];

    protected $casts = [
        'fda_lto_expiry' => 'date',
        'fda_cpr_expiry' => 'date',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'supplier_id', 'supplier_id');
    }

    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class, 'supplier_id', 'supplier_id');
    }

    public function stockReceiving()
    {
        return $this->hasMany(StockReceiving::class, 'supplier_id', 'supplier_id');
    }

    // Scopes
    public function scopeForBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeWithExpiringLicenses($query, $days = 30)
    {
        return $query->where(function ($q) use ($days) {
            $q->where('fda_lto_expiry', '<=', now()->addDays($days))
              ->orWhere('fda_cpr_expiry', '<=', now()->addDays($days));
        });
    }
}