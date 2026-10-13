<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use BelongsToTenant;

    protected $table = 'Purchase_Order';

    protected $primaryKey = 'po_id';

    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'supplier_id',
        'user_id',
        'po_number',
        'status',
        'total_amount',
        'notes',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

    public function stockReceiving()
    {
        return $this->hasMany(StockReceiving::class, 'supplier_id', 'supplier_id');
    }
}
