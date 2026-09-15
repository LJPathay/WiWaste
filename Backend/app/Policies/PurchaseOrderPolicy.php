<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PurchaseOrderPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function view(User $user, $purchaseOrder): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function create(User $user): bool
    {
        return $user->role === 'Owner';
    }

    public function update(User $user, $purchaseOrder): bool
    {
        return $user->role === 'Owner';
    }

    public function receive(User $user, $purchaseOrder): bool
    {
        return in_array($user->role, ['Owner', 'Inventory']);
    }

    public function cancel(User $user, $purchaseOrder): bool
    {
        return $user->role === 'Owner';
    }
}
