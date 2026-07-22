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
        'product_id', 'current_stock', 'stock_status'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
