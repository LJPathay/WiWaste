<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    protected $table = 'Purchase_Order_Item';
    protected $primaryKey = 'po_item_id';
    public $timestamps = false;

    protected $fillable = [
        'po_id', 'product_id', 'quantity', 'unit_price', 'subtotal', 'received_qty',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id', 'po_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
