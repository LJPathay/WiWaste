<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ForecastAccuracyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'forecast_date' => $this->forecast_date,
            'predicted_value' => $this->predicted_value,
            'actual_value' => $this->actual_value,
            'mape' => $this->mape,
            'model_version' => $this->model_version,
            'recorded_at' => $this->recorded_at,
        ];
    }
}
