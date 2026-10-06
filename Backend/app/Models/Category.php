<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
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

    public function products()
    {
        return $this->hasMany(Product::class, 'category_id', 'Category_id');
    }
}
