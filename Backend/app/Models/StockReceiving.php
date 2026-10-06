<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockReceiving extends Model
{
    protected $table = 'Stock_Receiving';

    protected $primaryKey = 'receiving_id';

    public $timestamps = true;

    protected $fillable = [
        'business_id',
        'branch_id',
        'supplier_id',
        'received_by',
        'verified_by',
        'received_at',
        'verified_at',
        'temperature_at_receipt',
        'condition_check_passed',
        'sanitation_check_passed',
        'notes',
        'status',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'verified_at' => 'datetime',
        'temperature_at_receipt' => 'decimal:2',
        'condition_check_passed' => 'boolean',
        'sanitation_check_passed' => 'boolean',
    ];

    /**
     * The accessor below resolves on the model but is dropped from `toArray()` unless
     * it is also listed here, so the JSON payload kept missing `id`.
     */
    protected $appends = ['id'];

    /**
     * The primary key is `receiving_id`, but every client reads `id` off the payload —
     * the frontend's `ApiStockReceiving` declares `id`, and the row actions post to
     * `/stock-receiving/{id}/…`. Without this alias the serialised record had no `id`
     * at all, so every one of those URLs went out as `/stock-receiving//`.
     */
    public function getIdAttribute(): int
    {
        return (int) $this->receiving_id;
    }

    public function business()
    {
        return $this->belongsTo(Business::class, 'business_id', 'id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id', 'id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by', 'User_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by', 'User_id');
    }

    public function items()
    {
        return $this->hasMany(StockReceivingItem::class, 'receiving_id', 'receiving_id');
    }
}
