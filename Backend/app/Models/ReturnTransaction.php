<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnTransaction extends Model
{
    protected $table = 'Return_Transaction';
    protected $primaryKey = 'return_id';
    public $timestamps = false;

    protected $fillable = [
        'sale_item_id', 'user_id', 'quantity_returned', 
        'reason', 'refund_amount', 'return_date'
    ];

    public function salesItem()
    {
        return $this->belongsTo(SalesItem::class, 'sale_item_id', 'sales_item_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }
}
