<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataPurgeLog extends Model
{
    protected $table = 'data_purge_logs';
    protected $primaryKey = 'log_id';
    public $timestamps = true;

    protected $fillable = [
        'business_id',
        'policy_id',
        'entity_type',
        'entity_table',
        'records_purged',
        'records_anonymized',
        'records_archived',
        'cutoff_date',
        'purged_at',
        'criteria_json',
        'action_taken',
        'details_json',
        'initiated_by',
        'status',
        'error_message',
    ];

    protected $casts = [
        'records_purged' => 'integer',
        'records_anonymized' => 'integer',
        'records_archived' => 'integer',
        'cutoff_date' => 'datetime',
        'purged_at' => 'datetime',
        'criteria_json' => 'json',
        'details_json' => 'json',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function policy()
    {
        return $this->belongsTo(DataRetentionPolicy::class, 'policy_id', 'policy_id');
    }

    // Scopes
    public function scopeForBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeForEntityType($query, $entityType)
    {
        return $query->where('entity_type', $entityType);
    }

    public function scopeByAction($query, $action)
    {
        return $query->where('action_taken', $action);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}