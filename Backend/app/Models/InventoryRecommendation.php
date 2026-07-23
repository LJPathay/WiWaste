<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryRecommendation extends Model
{
    protected $table = 'Inventory_Recommendation';
    protected $primaryKey = 'recommendation_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id', 'current_stock', 'recommended_stock',
        'recommendation_type', 'confidence_score',
        'status', 'reviewed_by', 'rejection_reason', 'created_at',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'User_id');
    }
}
