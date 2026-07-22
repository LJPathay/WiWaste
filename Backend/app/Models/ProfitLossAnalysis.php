<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProfitLossAnalysis extends Model
{
    protected $table = 'Profit_Loss_Analysis';
    protected $primaryKey = 'analysis_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id', 'total_sales', 'total_wastage_loss', 
        'risk_level', 'predicted_profit_leakage', 'analysis_date'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
