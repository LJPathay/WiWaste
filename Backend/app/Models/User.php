<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'User';
    protected $primaryKey = 'User_id';
    public $timestamps = false;

    protected $fillable = [
        'Full_name', 'username', 'password', 'email', 'role', 'status', 'Created_at'
    ];

    protected $hidden = [
        'password',
    ];

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'user_id', 'User_id');
    }

    public function salesTransactions()
    {
        return $this->hasMany(SalesTransaction::class, 'user_id', 'User_id');
    }

    public function wastageRecords()
    {
        return $this->hasMany(WastageRecord::class, 'user_id', 'User_id');
    }

    public function returnTransactions()
    {
        return $this->hasMany(ReturnTransaction::class, 'user_id', 'User_id');
    }
}
