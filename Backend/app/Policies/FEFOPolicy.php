<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class FEFOPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function view(User $user, $batch): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function flag(User $user, $batch): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function clear(User $user, $batch): bool
    {
        return in_array($user->role, [...Role::ownerTier(), 'Inventory']);
    }

    public function notify(User $user): bool
    {
        return Role::isOwnerTier($user->role);
    }
}
