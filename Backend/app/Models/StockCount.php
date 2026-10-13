<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class StockCount extends Model
{
    use BelongsToTenant;

    protected $table = 'stock_counts';

    protected $primaryKey = 'count_id';

    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'product_id',
        'batch_id',
        'counted_by',
        'system_qty',
        'counted_qty',
        'variance',
        'notes',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'system_qty' => 'integer',
        'counted_qty' => 'integer',
        'variance' => 'integer',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function batch()
    {
        return $this->belongsTo(FEFOBatch::class, 'batch_id', 'batch_id');
    }

    public function counter()
    {
        return $this->belongsTo(User::class, 'counted_by', 'User_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by', 'User_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}
