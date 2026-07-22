<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $table = 'Purchase_Order';
    protected $primaryKey = 'po_id';
    public $timestamps = false;

    protected $fillable = [
        'supplier_id', 'user_id', 'po_number', 'status',
        'total_amount', 'notes', 'created_at', 'updated_at',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class, 'po_id', 'po_id');
    }
}
