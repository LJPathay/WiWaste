<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ForecastAccuracy extends Model
{
    protected $table = 'forecast_accuracy';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'forecast_date',
        'predicted_value',
        'actual_value',
        'mape',
        'model_version',
        'recorded_at',
    ];

    protected $casts = [
        'forecast_date' => 'date',
        'predicted_value' => 'float',
        'actual_value' => 'float',
        'mape' => 'float',
        'recorded_at' => 'datetime',
    ];

    /**
     * Get the rolling MAPE for a product over the last N days.
     */
    public static function rollingMape(int $productId, int $days = 7): ?float
    {
        return static::where('product_id', $productId)
            ->where('forecast_date', '>=', now()->subDays($days))
            ->avg('mape');
    }
}
