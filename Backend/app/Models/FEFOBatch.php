<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FEFOBatch extends Model
{
    protected $table = 'FEFO_Batch';
    protected $primaryKey = 'batch_id';
    public $timestamps = false;

    protected $fillable = [
        'product_id', 'batch_number', 'quantity', 'expiry_date',
        'status', 'directive_notes', 'created_by', 'created_at',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'User_id');
    }
}