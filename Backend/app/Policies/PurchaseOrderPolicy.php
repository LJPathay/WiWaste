<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PurchaseOrderPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function view(User $user, $purchaseOrder): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function create(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function update(User $user, $purchaseOrder): bool
    {
        return Role::isOwnerTier($user->role);
    }

    public function receive(User $user, $purchaseOrder): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function cancel(User $user, $purchaseOrder): bool
    {
        return Role::isOwnerTier($user->role);
    }
}
