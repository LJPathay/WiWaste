<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrivacyProcessingRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'data_category',
        'purpose',
        'legal_basis',
        'retention_period',
        'recipients',
        'safeguards',
        'status',
    ];

    protected $casts = [
        'recipients' => 'array',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}