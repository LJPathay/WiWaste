<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    protected $table = 'Inventory';
    protected $primaryKey = 'inventory_id';
    public $timestamps = true;

    const UPDATED_AT = 'last_updated';
    const CREATED_AT = null;

    protected $fillable = [
        'business_id',
        'branch_id',
        'product_id',
        'current_stock',
        'stock_status',
    ];

    public static function calcStatus(int $stock, int $reorderLevel): string
    {
        if ($stock <= 0) return 'Out of Stock';
        if ($stock <= $reorderLevel) return 'Low Stock';
        if ($stock > $reorderLevel * 5) return 'Overstock';
        return 'Normal';
    }

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