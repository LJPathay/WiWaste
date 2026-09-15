<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DataBreachIncident extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'detected_at',
        'description',
        'personal_data_affected',
        'risk_assessment',
        'npc_notification_required',
        'npc_notified_at',
        'subjects_notified_at',
        'status',
        'resolved_at',
    ];

    protected $casts = [
        'detected_at' => 'datetime',
        'npc_notified_at' => 'datetime',
        'subjects_notified_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}