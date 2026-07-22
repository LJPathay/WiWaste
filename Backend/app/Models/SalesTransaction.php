<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesTransaction extends Model
{
    protected $table = 'Sales_Transaction';
    protected $primaryKey = 'transaction_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'total_amount', 'transaction_date', 
        'payment_method', 'amount_tendered', 'change_due', 'status'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }

    public function salesItems()
    {
        return $this->hasMany(SalesItem::class, 'transaction_id', 'transaction_id');
    }
}
