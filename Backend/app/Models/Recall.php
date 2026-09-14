<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Recall extends Model
{
    protected $table = 'Recalls';
    protected $primaryKey = 'recall_id';
    public $timestamps = true;

    protected $fillable = [
        'business_id',
        'branch_id',
        'recall_number',
        'product_id',
        'batch_id',
        'supplier_id',
        'reason',
        'severity',
        'status',
        'affected_batches',
        'total_quantity_affected',
        'initiated_date',
        'target_resolution_date',
        'actual_resolution_date',
        'initiated_by',
        'approved_by',
        'approved_at',
        'resolution_notes',
    ];

    protected $casts = [
        'affected_batches' => 'array',
        'initiated_date' => 'date',
        'target_resolution_date' => 'date',
        'actual_resolution_date' => 'date',
        'approved_at' => 'datetime',
        'initiated_by' => 'integer',
        'approved_by' => 'integer',
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

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function initiator()
    {
        return $this->belongsTo(User::class, 'initiated_by', 'User_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by', 'User_id');
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

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['active', 'quarantined', 'notified']);
    }

    // Methods
    public function quarantineAffectedInventory()
    {
        $affectedBatches = $this->affected_batches ?? [];
        $quarantinedCount = 0;

        foreach ($affectedBatches as $batchData) {
            $batchId = $batchData['batch_id'] ?? null;
            $quantity = $batchData['quantity'] ?? 0;

            if ($batchId) {
                $batch = FEFOBatch::find($batchId);
                if ($batch) {
                    $batch->status = 'quarantined';
                    $batch->save();
                    $quarantinedCount++;
                }
            }
        }

        $this->update([
            'status' => 'quarantined',
            'total_quantity_affected' => $quarantinedCount,
        ]);

        return $quarantinedCount;
    }

    public function notifyAffectedParties()
    {
        // In a real implementation, this would send notifications to:
        // - Internal stakeholders (owners, managers)
        // - Supplier (if supplier_id is set)
        // - Customers (if downstream traceability exists)
        // - Regulatory bodies (if severity is critical)

        $this->update(['status' => 'notified']);
    }

    public function resolve(array $resolutionData)
    {
        $this->update([
            'status' => 'resolved',
            'actual_resolution_date' => now()->toDateString(),
            'resolution_notes' => $resolutionData['notes'] ?? $this->resolution_notes,
        ]);

        // Release quarantine on batches if specified
        if ($resolutionData['release_quarantine'] ?? false) {
            $this->releaseQuarantine();
        }
    }

    public function releaseQuarantine()
    {
        $affectedBatches = $this->affected_batches ?? [];
        
        foreach ($affectedBatches as $batchData) {
            $batchId = $batchData['batch_id'] ?? null;
            if ($batchId) {
                $batch = FEFOBatch::find($batchId);
                if ($batch && $batch->status === 'quarantined') {
                    $batch->status = 'active';
                    $batch->save();
                }
            }
        }
    }
}