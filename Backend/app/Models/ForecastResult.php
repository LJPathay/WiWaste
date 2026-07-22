<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ForecastResult extends Model
{
    protected $table = 'Forecast_Result';
    protected $primaryKey = 'forecast_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id', 'forecast_period', 'predicted_demand', 
        'overstock_risk', 'generated_date'
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
