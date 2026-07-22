<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesItem extends Model
{
    protected $table = 'Sales_Item';
    protected $primaryKey = 'sales_item_id';
    public $timestamps = false;

    protected $fillable = [
        'transaction_id', 'product_id', 'quantity', 'unit_price', 'subtotal'
    ];

    public function transaction()
    {
        return $this->belongsTo(SalesTransaction::class, 'transaction_id', 'transaction_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function returnTransaction()
    {
        return $this->hasOne(ReturnTransaction::class, 'sale_item_id', 'sales_item_id');
    }
}
