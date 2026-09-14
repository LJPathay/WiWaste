<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'Audit_Log';
    protected $primaryKey = 'log_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'action', 'entity_type', 'entity_id',
        'old_values', 'new_values', 'created_at',
        'business_id', 'branch_id',
    ];

    // no casts — old_values / new_values stored as raw JSON text

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}