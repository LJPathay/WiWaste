<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WastageRecord extends Model
{
    protected $table = 'Wastage_Record';
    protected $primaryKey = 'wastage_id';
    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'branch_id',
        'product_id',
        'batch_id',
        'user_id',
        'wastage_type',
        'quantity',
        'estimated_loss',
        'date_recorded',
        'witnessed_by',
        'witnessed_at',
        'witness_notes',
        'disposal_method',
        'disposal_location',
        'requires_witness',
        'witness_verified',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'estimated_loss' => 'decimal:2',
        'date_recorded' => 'date',
        'witnessed_at' => 'datetime',
        'requires_witness' => 'boolean',
        'witness_verified' => 'boolean',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function batch()
    {
        return $this->belongsTo(FEFOBatch::class, 'batch_id', 'batch_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'User_id');
    }

    public function witness()
    {
        return $this->belongsTo(User::class, 'witnessed_by', 'User_id');
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

    /**
     * Check if this wastage record requires a witness
     */
    public function requiresWitness(): bool
    {
        return $this->estimated_loss >= 1000 || $this->requires_witness;
    }

    /**
     * Mark as witnessed
     */
    public function markWitnessed(int $witnessId, ?string $notes = null): void
    {
        $this->update([
            'witnessed_by' => $witnessId,
            'witnessed_at' => now(),
            'witness_notes' => $notes,
            'witness_verified' => true,
        ]);
    }

    /**
     * Get wastage type classification
     */
    public function getClassification(): string
    {
        $typeMap = [
            'Expired' => 'expiry',
            'Damaged' => 'physical',
            'Spoiled' => 'quality',
            'Lost' => 'shrinkage',
        ];

        return $typeMap[$this->wastage_type] ?? 'other';
    }
}