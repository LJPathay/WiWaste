<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Category extends Model
{
    use HasFactory;

    /**
     * Phase 19: the whole category list is reference data that every product form,
     * picker and dashboard reads, so it is held here for as long as nothing changes.
     * Both this model and Product drop the key on write (see `booted()` below and
     * `Product::boot()`), which is what makes `rememberForever` safe.
     */
    public const CACHE_KEY = 'categories.all';

    protected $table = 'Category';

    protected $primaryKey = 'Category_id';

    public $timestamps = false;

    protected $fillable = [
        'Category_name',
        'status',
    ];

    /** Categories still offered when assigning a product to one. */
    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }

    /**
     * Drops the cached list on any write, so no controller (or future command) can
     * forget to invalidate it. Product does the same in `Product::boot()` because the
     * cached rows carry `products_count`.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'category_id', 'Category_id');
    }
}
