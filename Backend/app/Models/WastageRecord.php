<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WastageRecord extends Model
{
    protected $table = 'Wastage_Record';
    protected $primaryKey = 'wastage_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id', 'user_id', 'wastage_type', 'quantity', 
        'estimated_loss', 'date_recorded'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }
}
