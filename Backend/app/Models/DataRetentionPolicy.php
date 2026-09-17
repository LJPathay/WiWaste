<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataRetentionPolicy extends Model
{
    protected $table = 'data_retention_policies';
    protected $primaryKey = 'policy_id';
    public $timestamps = true;

    protected $fillable = [
        'business_id',
        'entity_type',
        'entity_column',
        'retention_days',
        'retention_unit',
        'trigger_event',
        'action',
        'conditions_json',
        'is_active',
        'notify_before_purge',
        'notify_days_before',
        'description',
    ];

    protected $casts = [
        'retention_days' => 'integer',
        'notify_before_purge' => 'boolean',
        'notify_days_before' => 'integer',
        'is_active' => 'boolean',
        'conditions_json' => 'json',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function purgeLogs()
    {
        return $this->hasMany(DataPurgeLog::class, 'policy_id', 'policy_id');
    }

    // Scopes
    public function scopeForBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForEntityType($query, $entityType)
    {
        return $query->where('entity_type', $entityType);
    }

    /**
     * Get the cutoff date for this policy
     */
    public function getCutoffDate(): \Carbon\Carbon
    {
        $days = $this->retention_days;
        $unitMethod = match ($this->retention_unit ?? 'days') {
            'years' => 'subYears',
            'months' => 'subMonths',
            'weeks' => 'subWeeks',
            default => 'subDays',
        };

        return now()->{$unitMethod}($days);
    }

    /**
     * Check if a record should be purged based on this policy
     */
    public function shouldPurge(\Illuminate\Database\Eloquent\Model $record): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $cutoffDate = $this->getCutoffDate();
        $triggerField = $this->trigger_event ?? 'created_at';

        if (!$record->hasAttribute($triggerField)) {
            return false;
        }

        $recordDate = $record->{$triggerField};
        if (!$recordDate instanceof \Carbon\Carbon) {
            $recordDate = \Carbon\Carbon::parse($recordDate);
        }

        return $recordDate->lte($cutoffDate);
    }
}

