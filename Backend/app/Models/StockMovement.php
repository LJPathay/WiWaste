<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $table = 'Stock_Movement';
    protected $primaryKey = 'movement_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id', 'user_id', 'movement_type', 'quantity', 
        'remarks', 'movement_date', 'sale_item_id', 'wastage_id'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }

    public function salesItem()
    {
        return $this->belongsTo(SalesItem::class, 'sale_item_id', 'sales_item_id');
    }

    public function wastageRecord()
    {
        return $this->belongsTo(WastageRecord::class, 'wastage_id', 'wastage_id');
    }
}
