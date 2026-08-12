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
        'lower_bound', 'upper_bound', 'confidence',
        'overstock_risk', 'generated_date',
    ];

    protected $casts = [
        'predicted_demand' => 'float',
        'lower_bound' => 'float',
        'upper_bound' => 'float',
        'confidence' => 'float',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }
}
