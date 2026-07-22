<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    protected $table = 'Product';
    protected $primaryKey = 'product_id';
    public $timestamps = false;

    protected $fillable = [
        'category_id', 'supplier_id', 'barcode', 'product_name', 
        'cost_price', 'selling_price', 'reorder_level', 'expiration_date', 'status'
    ];

    /**
     * Auto-generate a unique SKU/barcode if none is provided when creating a product.
     * Format: SKU-{category_id}-{6-digit random number}
     * Example: SKU-02-849102
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Product $product) {
            if (empty($product->barcode)) {
                $product->barcode = static::generateUniqueSku($product->category_id);
            }
        });
    }

    /**
     * Generate a unique SKU that doesn't already exist in the database.
     */
    private static function generateUniqueSku(?int $categoryId): string
    {
        $prefix = 'SKU-' . str_pad($categoryId ?? 0, 2, '0', STR_PAD_LEFT);

        do {
            $sku = $prefix . '-' . str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (static::where('barcode', $sku)->exists());

        return $sku;
    }


    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'Category_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function inventory()
    {
        return $this->hasOne(Inventory::class, 'product_id', 'product_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'product_id', 'product_id');
    }

    public function salesItems()
    {
        return $this->hasMany(SalesItem::class, 'product_id', 'product_id');
    }

    public function wastageRecords()
    {
        return $this->hasMany(WastageRecord::class, 'product_id', 'product_id');
    }

    public function forecastResults()
    {
        return $this->hasMany(ForecastResult::class, 'product_id', 'product_id');
    }

    public function profitLossAnalyses()
    {
        return $this->hasMany(ProfitLossAnalysis::class, 'product_id', 'product_id');
    }

    public function inventoryRecommendations()
    {
        return $this->hasMany(InventoryRecommendation::class, 'product_id', 'product_id');
    }
}
