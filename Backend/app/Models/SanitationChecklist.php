<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class SanitationChecklist extends Model
{
    use BelongsToTenant;

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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'User_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by', 'User_id');
    }

    // Scopes
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
