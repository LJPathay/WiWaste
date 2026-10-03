<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class InventoryPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function view(User $user, $inventory): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function stockIn(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function stockOut(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function adjust(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function export(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }
}
