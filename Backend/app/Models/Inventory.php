<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use BelongsToTenant;

    protected $table = 'Inventory';

    protected $primaryKey = 'inventory_id';

    public $timestamps = true;

    const UPDATED_AT = 'last_updated';

    const CREATED_AT = null;

    protected $fillable = [
        'business_id',
        'branch_id',
        'product_id',
        'current_stock',
        'stock_status',
    ];

    public static function calcStatus(int $stock, int $reorderLevel): string
    {
        if ($stock <= 0) {
            return 'Out of Stock';
        }
        if ($stock <= $reorderLevel) {
            return 'Low Stock';
        }
        if ($stock > $reorderLevel * 5) {
            return 'Overstock';
        }

        return 'Normal';
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
