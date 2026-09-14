<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SanitationChecklist extends Model
{
    protected $table = 'Sanitation_Checklists';
    protected $primaryKey = 'checklist_id';
    public $timestamps = true;

    protected $fillable = [
        'business_id',
        'branch_id',
        'created_by',
        'checklist_date',
        'frequency',
        'area',
        'checks',
        'overall_status',
        'verified_by',
        'verified_at',
        'notes',
    ];

    protected $casts = [
        'checklist_date' => 'date',
        'checks' => 'array',
        'verified_at' => 'datetime',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'User_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by', 'User_id');
    }

    // Scopes
    public function scopeForBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeDaily($query)
    {
        return $query->where('frequency', 'daily');
    }

    public function scopeWeekly($query)
    {
        return $query->where('frequency', 'weekly');
    }

    public function scopeMonthly($query)
    {
        return $query->where('frequency', 'monthly');
    }
}