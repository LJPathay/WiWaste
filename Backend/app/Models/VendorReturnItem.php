<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorReturnItem extends Model
{
    protected $table = 'Vendor_Return_Items';
    protected $primaryKey = 'vendor_return_item_id';
    public $timestamps = true;

    protected $fillable = [
        'vendor_return_id',
        'product_id',
        'batch_id',
        'quantity',
        'unit_cost',
        'total_credit',
        'reason',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'total_credit' => 'decimal:2',
    ];

    public function vendorReturn()
    {
        return $this->belongsTo(VendorReturn::class, 'vendor_return_id', 'vendor_return_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function batch()
    {
        return $this->belongsTo(FEFOBatch::class, 'batch_id', 'batch_id');
    }
}